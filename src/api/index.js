// ============================================================
// api/index.js — 前端与后端通信的"桥梁"
// 通俗理解：这个文件就像是一个"电话本"，存放了所有可以打给后端的电话号码（接口地址）。
// 其他地方（登录页、注册页、聊天页）只要引入这里的函数，就能轻松地"打电话"给后端。
// ============================================================

// 1) 引入 axios：一个专门用来发 HTTP 请求的工具库
//    类比：axios 就像一部"电话机"，负责拨号、等待接通、传递消息
import axios from 'axios'

// 简历接口要按用户名区分归属，复用 localStorage 那套身份规则（见文件末尾第 9 节）
import { getUserId } from '@/utils/userStorage.js'

// 2) 定义后端服务器地址（BASE_URL）
//    这行代码告诉 axios："你的电话要打给谁"
//    如果你把后端部署到其他电脑或云端，把引号里的地址改掉就行
//    例如：'http://我的服务器IP:8000' 或 'https://api.mysite.com'
const BASE_URL = 'http://localhost:8000'
//    ↑ localhost 代表"本机电脑"的意思，8000 是后端程序监听的"门牌号"（端口）

// 3) 创建 axios 实例（相当于组装好一部电话机）
//    axios.create({...}) 创建一个"配置好的电话"，之后直接用这个实例打电话就行
const api = axios.create({
  baseURL: BASE_URL,   // 基础地址：每次请求都会自动加在前面
  timeout: 30000,      // 超时时间（毫秒）：30秒没收到后端回复就放弃
  headers: { 'Content-Type': 'application/json' }  // 告诉后端："我发的是 JSON 格式的数据"
})

// ============================================================
// 4) 注册接口函数
//    功能：把用户名和密码发给后端，让后端创建一个新用户
//    类比：去银行开个新账户
//    参数：
//      username — 用户名（你想注册的账号名）
//      password — 密码（你设定的登录密码）
//    返回值：一个 Promise（可以理解为"承诺对象"——承诺将来一定给你一个结果）
//    调用方式：registerAPI('张三', 'abc123')
// ============================================================
export function registerAPI(username, password) {
  // api.post() 发送一个 POST 请求（POST 代表"提交数据"）
  // 第一个参数是接口路径，第二个参数是要发送的数据（对象格式）
  // 最终实际请求的完整地址 = BASE_URL + '/api/auth/register'
  //                       = http://localhost:8000/api/auth/register
  return api.post('/api/auth/register', { username, password })
  //                                              ↑ 发给后端的数据体：
  //                                              { "username": "张三", "password": "abc123" }
}
//    ↑ export 表示"导出"这个函数，让其他文件可以 import（引入）使用

// ============================================================
// 5) 登录接口函数
//    功能：把用户名和密码发给后端，验证是否是已注册用户
//    类比：用银行卡号和密码登录网上银行
//    成功时后端会返回一个 token（令牌），相当于一张"临时通行证"，
//    证明你已经登录了，后续操作不需要重复输入密码
// ============================================================
export function loginAPI(username, password) {
  // 同样是 POST 请求，路径不同
  return api.post('/api/auth/login', { username, password })
}

// ============================================================
// 6) AI 聊天接口函数
//    功能：把用户说的话、选择的岗位、用户ID一起发给后端，
//          后端调用 AI 大模型生成面试官的回答
//    参数：
//      message  — 用户输入的文本（如"请开始面试"）
//      position — 面试岗位（如"Java后端"、"Web前端"）
//      user_id  — 用户唯一标识（从登录信息中获取）
// ============================================================
export function chatAPI(message, position, user_id) {
  return api.post('/api/chat', { message, position, user_id })
}

// ============================================================
// 7) 评分报告生成接口函数（依据《api接口.docx》文档新增）
//    功能：把面试的题目/参考答案/用户回答（items 数组）发给后端，
//          后端代理转发给 ECharts 报告服务，返回可视化报告 HTML。
//    参数：
//      items — 面试题目数组，每项结构：
//              { 题目: string, 参考答案: string, 用户回答: string }
//    返回：{ code: 0, msg: 'ok', html: '<!DOCTYPE html>...' }
//    用法：前端拿到 html 后，通过 <iframe :srcdoc="html"> 直接渲染
// ============================================================
export function reportHTMLAPI(items) {
  return api.post('/api/report/html', { items })
}

// ============================================================
// 8) Dify 打分工作流接口函数（依据《api接口.docx》文档新增）
//    功能：单独调用 Dify 打分工作流，获取评分/评价文本报告。
//    参数：
//      items — 同上面的 items 数组（题目/参考答案/用户回答）
//    返回：{ code: 0, msg: 'ok', report: string, raw: object }
//    说明：报告接口内部已调用打分，此函数用于单独获取评分文本
// ============================================================
export function scoreEvaluateAPI(items) {
  return api.post('/api/score/evaluate', { items })
}

// ============================================================
// 9) 简历接口函数
//    背景：简历原来只存在浏览器 localStorage（键名被 userStorage 前缀成
//    `<用户名>_saved_resumes`），换个浏览器、清一次缓存就全丢了。
//    现在改存服务端，实现跨浏览器同步。
//
//    归属怎么定：按用户名区分，username 复用 userStorage.getUserId()
//    （已登录取登录名，试用模式取 'guest'）—— 刻意不另写一套，
//    否则两处规则一分叉就会出现「本地记在 A 名下、上传到了 B 名下」。
//
//    信任边界要说清：这个 username 是前端自述的，后端没有 token 校验，
//    所以这套接口解决的是「换设备还能看到自己的简历」，【不是】「防越权」。
// ============================================================
export function fetchResumesAPI() {
  return api.get('/api/resumes', { params: { username: getUserId() } })
}

// 新建与修改共用同一个接口：带上已有 id 后端就原地替换，不带就新建。
// 分开成 POST + PUT 两个接口只会让「id 到底存不存在」这个判断在多处重复。
export function saveResumeAPI(resume) {
  return api.post('/api/resumes', { username: getUserId(), resume })
}

// 首次加载时把浏览器里的存量简历搬上去。
// 后端按 id 去重后追加，所以重复调用是安全的（每次页面加载都会调一次）。
export function importResumesAPI(resumes) {
  return api.post('/api/resumes/bulk', { username: getUserId(), resumes })
}

export function deleteResumeAPI(id) {
  return api.delete(`/api/resumes/${encodeURIComponent(id)}`, {
    params: { username: getUserId() }
  })
}

/* ============================================================
   题库练习（用户端）
   ============================================================ */
// 题库列表：只给名字和题数
export function fetchBanksAPI() {
  return api.get('/api/banks', { timeout: 20000 })
}

// 取整库（含参考答案 —— 练习/交卷后才会展示给用户）
export function fetchBankAPI(bankId) {
  return api.get(`/api/banks/${encodeURIComponent(bankId)}`, { timeout: 30000 })
}

// 按参考答案让模型逐题打分。答题多时耗时较长，超时给足
export function scorePracticeAPI(items) {
  return api.post('/api/practice/score', { items }, { timeout: 240000 })
}

/* ============================================================
   练习 / 考试记录（按账号，存服务端）
   ============================================================ */
export function fetchPracticeRecordsAPI() {
  return api.get('/api/practice/records', { params: { username: getUserId() }, timeout: 20000 })
}

// 一条记录 = 一道题的一次作答
export function savePracticeRecordsAPI(records) {
  return api.post('/api/practice/records', { username: getUserId(), records })
}

export function saveExamRecordAPI(payload) {
  return api.post('/api/practice/exams', { username: getUserId(), ...payload })
}

export function clearPracticeRecordsAPI(bank, category) {
  return api.delete('/api/practice/records', {
    params: { username: getUserId(), bank, category }
  })
}

export function fetchPracticeStatsAPI() {
  return api.get('/api/practice/stats', { params: { username: getUserId() }, timeout: 30000 })
}

export function deleteExamRecordAPI(id) {
  return api.delete(`/api/practice/exams/${encodeURIComponent(id)}`, {
    params: { username: getUserId() }
  })
}

// 7) 默认导出 api 实例本身
//    这样其他文件既可以导入上面的函数，也可以直接导入 api 对象自己发请求
export default api
