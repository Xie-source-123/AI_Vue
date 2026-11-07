import { clearGuestData } from './userStorage.js'
import { reloadAvatar } from './avatar.js'

/**
 * 退出登录。
 *
 * 数据策略（业务约定）：
 * - 正式账号：只清登录态（token / username / guest_mode），本地数据保留 ——
 *   数据本来就是按用户名隔离存储的（`用户名_键名`），重新登录同一账号后
 *   简历、面试记录、报告都还在。
 * - 访客账号：连数据一起清。userStorage 里写明「试用模式数据退出时清空」，
 *   而且访客数据的前缀是固定的 `guest_`，不清理会串给下一个访客。
 *
 * 注意：token 目前写入后并无任何地方读取（没有路由守卫，也没加到请求头），
 * 清理它是为了将来接入鉴权时不留脏数据。
 */
export function logout(router) {
  try {
    if (localStorage.getItem('guest_mode') === 'true') clearGuestData()

    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('guest_mode')
  } catch {
    /* localStorage 不可用时忽略 */
  }

  /* 立即刷新内存里的头像，否则换账号登录时首帧会闪出上一个用户的头像 */
  reloadAvatar()

  if (router) router.push('/')
}

export default { logout }
