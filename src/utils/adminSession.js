/**
 * 管理后台的登录态。
 *
 * 和普通用户的登录态刻意分开存：
 *   - 普通用户用 `token` / `username`（session.js 管）；
 *   - 管理员用 `admin_token` / `admin_username`。
 * 分开的好处是「在后台里退出登录」不会把前台的普通登录态一起清掉，
 * 反之亦然 —— 两者本来就是两套权限，混在一个键上迟早会互相干扰。
 *
 * 注意：这里的 token 只是「拿着去给后端验」的凭据，本身不含任何权限信息。
 * 真正的权限判定全在后端的 require_admin 里 —— 前端存什么、改什么，
 * 都绕不过 X-Admin-Token 的校验。
 */
const TOKEN_KEY = 'admin_token'
const NAME_KEY = 'admin_username'

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function getAdminName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export function setAdminSession(token, username) {
  try {
    localStorage.setItem(TOKEN_KEY, token || '')
    localStorage.setItem(NAME_KEY, username || '')
  } catch {
    /* 隐私模式下写不进去，此时登录态只存在于当前内存，刷新即失效 */
  }
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NAME_KEY)
  } catch {
    /* 忽略 */
  }
}

export function isAdminLoggedIn() {
  return !!getAdminToken()
}
