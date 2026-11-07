/**
 * 用户隔离的 localStorage 工具
 *
 * 每个登录用户的 localStorage key 自动添加用户名前缀，
 * 确保不同账户之间的数据完全隔离。
 *
 * 试用模式（guest_mode）数据也独立存储，退出时清空。
 */

/** 获取当前用户标识（用户名或 guest）
 *
 * 导出是为了让「要带身份给后端」的地方（如简历接口）与 localStorage 用同一套规则，
 * 而不是各写一遍 —— 两处规则一旦分叉，就会出现「本地存到 A 名下、上传到 B 名下」。
 */
export function getUserId() {
  const username = localStorage.getItem('username')
  if (username) return username
  const isGuest = localStorage.getItem('guest_mode')
  if (isGuest) return 'guest'
  // 未登录也未试用，使用默认 key（兼容）
  return ''
}

/** 生成带用户前缀的 key */
function userKey(key) {
  const uid = getUserId()
  return uid ? `${uid}_${key}` : key
}

/** 获取当前用户的数据 */
export function getUserItem(key) {
  return localStorage.getItem(userKey(key))
}

/** 设置当前用户的数据 */
export function setUserItem(key, value) {
  localStorage.setItem(userKey(key), value)
}

/** 删除当前用户的某条数据 */
export function removeUserItem(key) {
  localStorage.removeItem(userKey(key))
}

/** 获取当前用户的数据（JSON） */
export function getUserJSON(key) {
  const raw = getUserItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** 设置当前用户的数据（JSON） */
export function setUserJSON(key, value) {
  setUserItem(key, JSON.stringify(value))
}

/** 清除当前用户的所有数据（退出时调用） */
export function clearUserData() {
  const uid = getUserId()
  if (!uid) return
  const prefix = `${uid}_`
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))
}

/** 清除试用模式的所有数据 */
export function clearGuestData() {
  const prefix = 'guest_'
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))
}

/** 生成用户 key（用于在其他模块中直接拼接 key 名） */
export function scopedKey(key) {
  return userKey(key)
}

export default {
  getUserItem,
  setUserItem,
  removeUserItem,
  getUserJSON,
  setUserJSON,
  clearUserData,
  clearGuestData,
  scopedKey
}
