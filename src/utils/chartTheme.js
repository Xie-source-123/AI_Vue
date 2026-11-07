/**
 * 图表配色：从当前主题的 CSS 变量读取，保证浅色 / 深色模式都协调。
 */
export function chartTokens() {
  const empty = {
    accent: '#4F9D7A',
    accentHover: '#3A7D60',
    accentInk: '#FFFFFF',
    accentSoft: '#C5F09B',
    ink: '#14332B',
    body: '#2A4A3F',
    muted: '#6B8A7D',
    hairline: '#E2EEE4',
    canvas: '#FFFFFF',
    canvas2: '#F7FBF3',
    surface2: '#F2F8EE',
    warn: '#B8860B',
    danger: '#C4453C',
    info: '#3A8FA0',
    success: '#3A9D6A'
  }
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return empty

  const cs = getComputedStyle(document.documentElement)
  const get = (name, fallback) => {
    const v = cs.getPropertyValue(name)
    return v && v.trim() ? v.trim() : fallback
  }
  return {
    accent: get('--accent', empty.accent),
    accentHover: get('--accent-hover', empty.accentHover),
    accentInk: get('--accent-ink', empty.accentInk),
    accentSoft: get('--accent-soft', empty.accentSoft),
    ink: get('--ink', empty.ink),
    body: get('--body', empty.body),
    muted: get('--body-muted', empty.muted),
    hairline: get('--hairline', empty.hairline),
    canvas: get('--canvas', empty.canvas),
    canvas2: get('--canvas-2', empty.canvas2),
    surface2: get('--surface-2', empty.surface2),
    warn: get('--warn', empty.warn),
    danger: get('--danger', empty.danger),
    info: get('--info', empty.info),
    success: get('--success', empty.success)
  }
}

/** 十六进制色 → rgba 字符串，用于面积填充 */
export function alpha(hex, a) {
  const h = String(hex).replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full.slice(0, 6), 16)
  if (Number.isNaN(n)) return hex
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** 图表通用坐标轴文字样式 */
export function axisLabelStyle(t, size = 11) {
  return { color: t.muted, fontSize: size }
}
