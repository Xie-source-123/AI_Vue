// ============================================================
// api/admin.js — 管理后台的接口层
// ============================================================
// 与 api/index.js（前台）分开的理由：
//   1. 管理接口全都要带 X-Admin-Token 头，混在一起会让每个前台请求
//      都白带一个头，也让「哪些接口需要管理员」这件事变得看不出来；
//   2. 管理员令牌过期时要单独处理（清本地态 + 打回首页），
//      和前台请求的失败处理不是一回事。
import axios from 'axios'
import { getAdminToken, clearAdminSession } from '@/utils/adminSession.js'

const BASE_URL = 'http://localhost:8000'

export const adminApi = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
})

/* 每个管理请求自动带上令牌。手动逐个接口写头必然会漏掉某一个，
   而漏掉的那个会以 401 的形式在运行时才暴露出来。 */
adminApi.interceptors.request.use((config) => {
  const token = getAdminToken()
  if (token) config.headers['X-Admin-Token'] = token
  return config
})

/* 401 = 没登录 / 令牌过期。此时清掉本地令牌并打回首页。
   这里用 location 而不是 router：api 层 import router 会形成循环依赖
   （router → 视图 → api → router）。过期后整页重载也正好把后台的内存态清干净。 */
adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearAdminSession()
      if (window.location.pathname.startsWith('/admin')) window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

/** 从 axios 错误里抽出人能看懂的原因（后端把说明放在 detail 里） */
export function adminErrorText(err, fallback = '请求失败') {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  )
}

/* ===== 鉴权 ===== */
export function adminLoginAPI(username, password) {
  return adminApi.post('/api/auth/admin-login', { username, password })
}
export function adminLogoutAPI() {
  return adminApi.post('/api/auth/admin-logout')
}

/* ===== 用户管理 ===== */
export function fetchUsersAPI() {
  return adminApi.get('/api/admin/users')
}
export function toggleUserAPI(username, enabled) {
  return adminApi.post(`/api/admin/users/${encodeURIComponent(username)}/enabled`, { enabled })
}
export function resetUserPasswordAPI(username, password) {
  return adminApi.post(`/api/admin/users/${encodeURIComponent(username)}/password`, { password })
}
export function deleteUserAPI(username) {
  return adminApi.delete(`/api/admin/users/${encodeURIComponent(username)}`)
}

/* ===== 岗位管理 ===== */
export function fetchPositionsAPI() {
  return adminApi.get('/api/positions')
}
export function createPositionAPI(payload) {
  return adminApi.post('/api/admin/positions', payload)
}
export function updatePositionAPI(original, payload) {
  return adminApi.put(`/api/admin/positions/${encodeURIComponent(original)}`, payload)
}
export function deletePositionAPI(value) {
  return adminApi.delete(`/api/admin/positions/${encodeURIComponent(value)}`)
}

/* ===== 题库管理 =====
   已改成「多题库」模型：题库由 Excel 导入或手动新建，题目挂在题库下面。
   上传拆成两步：先 parse 拿预览（不入库），人工确认后再 commit。 */

// 解析 Excel，返回可编辑的题目预览（不落库）
export function parseBankAPI(payload) {
  return adminApi.post('/api/admin/banks/parse', payload, { timeout: 180000 })
}

// 把确认过的预览正式入库
export function commitBankAPI(payload) {
  return adminApi.post('/api/admin/banks/commit', payload, { timeout: 180000 })
}

// 跨题库的题目总表（管理页定位用）
export function fetchAllQuestionsAPI() {
  return adminApi.get('/api/admin/questions', { timeout: 60000 })
}

/* ===== 公告（跑马灯）===== */
export function fetchAnnouncementsAPI() {
  return adminApi.get('/api/admin/announcements')
}
export function saveAnnouncementsAPI(announcements) {
  return adminApi.post('/api/admin/announcements', { announcements })
}

/* ===== 总览 / 系统状态 ===== */
export function fetchOverviewAPI() {
  return adminApi.get('/api/admin/overview')
}
// 版本号（公开接口，不带管理令牌也能取）
export function fetchVersionAPI() {
  return axios.get(`${BASE_URL}/api/version`, { timeout: 10000 })
}
export function fetchSystemStatusAPI(probe = false) {
  return adminApi.get('/api/admin/system-status', { params: { probe: probe ? 1 : 0 } })
}

/* ===== 面试记录上报（前台调用，不需要管理员令牌）=====
   故意不走 adminApi：它属于前台流程，不该带上管理令牌。 */
export function reportInterviewRecordAPI(username, record) {
  return axios.post(
    `${BASE_URL}/api/interview/records`,
    { username, record },
    { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
  )
}

/* ===== 公开岗位列表（前台 PositionPicker 用）===== */
export function fetchPublicPositionsAPI() {
  return axios.get(`${BASE_URL}/api/positions`, { timeout: 20000 })
}

/* ============================================================
   界面配色
   ============================================================ */
// 公开读：首页在未登录时也要拿到配色才能上色，所以走裸 axios，
// 不能挂在 adminApi 上（那个实例会带 X-Admin-Token 并在 401 时跳登录页）。
export function fetchPublicUiThemeAPI() {
  return axios.get(`${BASE_URL}/api/ui-theme`, { timeout: 10000 })
}

export function saveUiThemeAPI(theme) {
  return adminApi.put('/api/admin/ui-theme', { theme })
}

export function resetUiThemeAPI() {
  return adminApi.delete('/api/admin/ui-theme')
}

/* ============================================================
   题库管理（后台）
   ============================================================ */
export function fetchBanksAdminAPI() {
  return adminApi.get('/api/admin/banks')
}

// Excel 走 base64 而不是 multipart：后端虚拟环境里没有 python-multipart，
// 用 JSON 传文件内容可以完全不装依赖。
export function uploadBankAPI({ name, filename, dataBase64 }) {
  return adminApi.post('/api/admin/banks/upload', { name, filename, data_base64: dataBase64 }, { timeout: 120000 })
}

export function createBankAPI(name) {
  return adminApi.post('/api/admin/banks', { name })
}

export function deleteBankAPI(bankId) {
  return adminApi.delete(`/api/admin/banks/${bankId}`)
}

// 题库名会显示在用户端当「岗位」分类，所以改名是用户可见的操作
export function renameBankAPI(bankId, name) {
  return adminApi.put(`/api/admin/banks/${bankId}`, { name })
}

export function fetchBankQuestionsAPI(bankId) {
  return adminApi.get(`/api/admin/banks/${bankId}/questions`, { timeout: 60000 })
}

export function addQuestionAPI(bankId, question) {
  return adminApi.post(`/api/admin/banks/${bankId}/questions`, question)
}

export function updateQuestionAPI(bankId, qid, question) {
  return adminApi.put(`/api/admin/banks/${bankId}/questions/${qid}`, question)
}

export function deleteQuestionAPI(bankId, qid) {
  return adminApi.delete(`/api/admin/banks/${bankId}/questions/${qid}`)
}

export default adminApi
