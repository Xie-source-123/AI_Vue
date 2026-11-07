import { ref } from 'vue'
import { getUserItem, setUserItem, removeUserItem } from './userStorage.js'

const KEY = 'avatar'

/**
 * 头像 dataURL。
 *
 * 做成模块级响应式 ref —— 头像在三个地方显示（个人信息横幅、侧边栏图标条、
 * 偏好设置账户卡），它们绑定同一个 ref 即可自动同步，不需要事件总线。
 */
export const avatar = ref('')

/** 从存储重新读取。切换账号（登录/退出）后组件会重新挂载，挂载时调用它。 */
export function reloadAvatar() {
  avatar.value = getUserItem(KEY) || ''
}

export function saveAvatar(dataUrl) {
  avatar.value = dataUrl || ''
  if (dataUrl) setUserItem(KEY, dataUrl)
  else removeUserItem(KEY)
}

/**
 * 读文件 → 居中裁成正方形 → canvas 缩到 size×size → 返回 dataURL。
 *
 * 必须压缩：头像要存进 localStorage（整站上限约 5MB），而手机拍的原图动辄
 * 3–8MB，直接存 dataURL 会撑爆配额导致整个站点的本地数据写入失败。
 * 200×200 JPEG q0.85 大约 10–20KB，留足余量。
 */
export function fileToAvatar(file, size = 200) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('未选择文件'))
    if (!String(file.type || '').startsWith('image/')) {
      return reject(new Error('请选择图片文件'))
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片解析失败'))
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          // 短边对齐后居中裁切，避免非正方形图片被拉变形
          const side = Math.min(img.width, img.height)
          ctx.drawImage(
            img,
            (img.width - side) / 2,
            (img.height - side) / 2,
            side,
            side,
            0,
            0,
            size,
            size
          )
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        } catch (e) {
          reject(new Error('图片处理失败'))
        }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/** 便于在 <img src> / 首字母之间切换 */
export function hasAvatar() {
  return !!avatar.value
}

export default { avatar, reloadAvatar, saveAvatar, fileToAvatar, hasAvatar }
