import { ref, computed, watchEffect } from 'vue'

const STORAGE_KEY = 'node-theme'

/** 主题模式：'light' | 'dark' | 'system' */
const mode = ref('system')

const systemDark = ref(
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
)

try {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') mode.value = saved
} catch {
  /* 无 localStorage 时按 system 走 */
}

const isDark = computed(
  () => mode.value === 'dark' || (mode.value === 'system' && systemDark.value)
)

watchEffect(() => {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  el.dataset.theme = isDark.value ? 'dark' : 'light'
  el.style.colorScheme = isDark.value ? 'dark' : 'light'
})

let listenerBound = false

export function useTheme() {
  if (!listenerBound && typeof window !== 'undefined' && window.matchMedia) {
    listenerBound = true
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => {
      systemDark.value = e.matches
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else if (mq.addListener) mq.addListener(onChange)
  }

  const setMode = (value) => {
    if (value !== 'light' && value !== 'dark' && value !== 'system') return
    mode.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* 忽略写入失败 */
    }
  }

  const toggle = () => setMode(isDark.value ? 'light' : 'dark')

  return { mode, isDark, setMode, toggle }
}

export default { useTheme }
