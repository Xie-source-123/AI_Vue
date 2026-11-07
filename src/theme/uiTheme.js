/**
 * 界面配色 —— 令牌级颜色控制
 *
 * 为什么是「6 个输入色 + 13 个自动推导」而不是「19 个令牌全开放」：
 * 19 个令牌里有 7 个是 Element Plus 的派生色（light-3/5/7/8/9、dark-2），
 * 还有 5 个是同色的不同透明度。手填极容易和主色对不上，界面就会花。
 * 这里只让用户给 6 个色，其余按固定规则算出来。
 *
 * 推导规则是从 base.css 里四套现成色板【反推】的，不是拍的：
 *   浅色 hover = 主色 × 0.80        —— 面试 #2e7d5b → #23634a，实测吻合
 *   深色 hover = 主色向白混 30%      —— 管理员 #6fc5d6 → #93d6e3，吻合
 *   浅色玻璃   = 主色向白混 90% / 78% —— 管理员算得 (235,243,245) vs 实际 (233,244,247)
 *   深色玻璃   = 主色整体 × 0.155 / 0.08 —— 实际 (17,32,37) / (9,15,17)，吻合
 * 所以「点缀色缺省跟随主色」时，本模块算出的值与改造前【完全一致】，
 * 这个特性被用来做验证：不改任何配置，界面应与改造前逐像素相同。
 *
 * 生效方式：写在 documentElement 的行内样式上（setProperty）。
 * 行内样式优先级高于 html[data-ws='xxx'] 那套选择器，能盖掉 base.css；
 * 挂在 <html> 而不是某个组件上，是因为弹窗会 teleport 到 <body>。
 */

import { ref, watch } from 'vue'
import { getUserItem, setUserItem, removeUserItem } from '@/utils/userStorage.js'

/** 可配的界面。首页用的是 :root 默认（草木青），不在其中 —— 它没有 data-ws。 */
export const THEME_TARGETS = [
  { ws: 'interview', label: '面试工作台', sub: '草木绿' },
  { ws: 'data', label: '数据工作台', sub: '冷青' },
  { ws: 'me', label: '个人工作台', sub: '橄榄绿' },
  { ws: 'admin', label: '管理后台', sub: '石墨灰 + 金色点缀' }
]

/** 全部 19 个令牌。清空时要按这份清单逐个移除 —— 否则改了配置后，
 *  上一版留下的行内样式会一直压着 base.css，比「没生效」更难查。 */
export const TOKEN_KEYS = [
  '--accent',
  '--accent-hover',
  '--accent-soft',
  '--accent-ink',
  '--accent-wash',
  '--accent-wash-2',
  '--shell-glow',
  '--accent-line',
  '--accent-glow',
  '--glow',
  '--card-grad',
  '--el-color-primary',
  '--el-color-primary-light-3',
  '--el-color-primary-light-5',
  '--el-color-primary-light-7',
  '--el-color-primary-light-8',
  '--el-color-primary-light-9',
  '--el-color-primary-dark-2'
]

/* ============================================================
   颜色工具
   ============================================================ */
const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)))

function hexToRgb(hex) {
  let h = String(hex || '').trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

const toHex = (rgb) => '#' + rgb.map((n) => clamp255(n).toString(16).padStart(2, '0')).join('')

/** 线性混合：t=0 取 a，t=1 取 b */
export function mix(a, b, t) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  if (!A || !B) return a
  return toHex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t))
}

const shade = (c, t) => mix(c, '#000000', t)
const tint = (c, t) => mix(c, '#ffffff', t)

/** 按比例整体缩放 RGB。深色主题的玻璃底就是这么来的（主色 × 0.15） */
export function scale(c, f) {
  const A = hexToRgb(c)
  return A ? toHex(A.map((n) => n * f)) : c
}

export function alpha(c, a) {
  const A = hexToRgb(c)
  return A ? `rgba(${A[0]}, ${A[1]}, ${A[2]}, ${a})` : c
}

/** WCAG 相对亮度。用来决定压在主色上的文字该用白还是深色 */
function luminance(c) {
  const A = hexToRgb(c)
  if (!A) return 0
  const [r, g, b] = A.map((n) => {
    const s = n / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const isHex = (v) => hexToRgb(v) !== null

/* ============================================================
   默认色板 —— 前三套与 base.css 现有值一致；管理员是新的石墨灰 + 金
   ============================================================ */
export const DEFAULT_UI_THEME = {
  interview: {
    light: { accent: '#2b79b6', hover: '#226192', highlight: '#2b79b6' },
    dark: { accent: '#e6f4ff', hover: '#eef7ff', highlight: '#e6f4ff' }
  },
  data: {
    light: { accent: '#d14339', hover: '#a8362e', highlight: '#d14339' },
    dark: { accent: '#fff1f0', hover: '#fff4f3', highlight: '#fff1f0' }
  },
  me: {
    light: { accent: '#75781c', hover: '#5e6016', highlight: '#75781c' },
    dark: { accent: '#feffe6', hover: '#feffe9', highlight: '#feffe6' }
  },
  /* 石墨灰当主色（按钮 / 选中态 / 图表 / 背景），金色只落在边框与光环上。
     金色不要当主色：它是低饱和的暖黄，白字压上去对比度不足，
     大面积铺开会显得脏 —— 细边线才是它合适的位置。 */
  admin: {
    light: { accent: '#3f4753', hover: '#2f3540', highlight: '#c8a45c' },
    dark: { accent: '#b9c2cf', hover: '#d3dae3', highlight: '#d8b76f' }
  }
}

/* ============================================================
   推导：6 个输入色 → 19 个令牌
   ============================================================ */
export function deriveTokens(cfg, theme) {
  const dark = theme === 'dark'
  const A = cfg.accent
  // 点缀色缺省跟随主色 —— 这样未配置时算出的值与 base.css 完全一致
  const H = cfg.highlight || A
  const hv = cfg.hover || (dark ? tint(A, 0.3) : shade(A, 0.2))
  const soft = dark ? tint(A, 0.33) : tint(A, 0.55)
  // 点缀色的「柔色版」，给发光用。原设计里 --accent-glow 取的是
  // rgba(soft, 0.5) 而不是 rgba(主色, 0.5) —— 拿主色直接当发光会明显偏深。
  const softH = dark ? tint(H, 0.33) : tint(H, 0.55)

  return {
    '--accent': A,
    '--accent-hover': hv,
    '--accent-soft': soft,
    // 压在主色上的文字：浅色主题下主色都很深，用白；深色主题下主色都很亮，用深。
    // 不靠主题硬编码，而是按亮度判 —— 用户可能把浅色主题的主色设成亮黄。
    '--accent-ink': dark ? scale(A, 0.12) : luminance(A) > 0.55 ? '#0a1a1f' : '#ffffff',
    '--accent-wash': alpha(A, dark ? 0.16 : 0.12),
    '--accent-wash-2': alpha(A, dark ? 0.22 : 0.2),
    '--shell-glow': alpha(A, dark ? 0.1 : 0.22),

    // 下面三个取【点缀色】—— 这是金色真正能被看见的地方：
    //   --accent-line 是卡片/按钮/聊天气泡的边框色，全项目 30+ 处在用；
    //   --accent-glow 是聚焦光环，--glow 是选中项的外发光。
    // 反过来说：只把 --accent-glow 改成金色是看不见的，它全项目只用了一处。
    '--accent-line': alpha(H, dark ? 0.36 : 0.34),
    '--accent-glow': alpha(softH, dark ? 0.28 : 0.5),
    '--glow': alpha(H, 0.22),

    // 卡底是【纯色半透】，不做任何颜色过渡（原来是 158° 的双色渐变，已按需求去掉）。
    // 浅色主题往白里混 90% 得到淡底；深色主题把主色整体压到 16% 得到深底。
    '--card-grad': alpha(dark ? scale(A, 0.16) : tint(A, 0.9), 0.74),

    '--el-color-primary': A,
    // Element Plus 的 light-N 在浅色主题里是「往白里混」，在深色主题里
    // 反而是「压暗」—— 因为它在深色下被当作背景色用，必须是暗的。
    '--el-color-primary-light-3': tint(A, 0.3),
    '--el-color-primary-light-5': dark ? scale(A, 0.22) : tint(A, 0.5),
    '--el-color-primary-light-7': dark ? scale(A, 0.18) : tint(A, 0.7),
    '--el-color-primary-light-8': dark ? scale(A, 0.15) : tint(A, 0.8),
    '--el-color-primary-light-9': dark ? scale(A, 0.13) : tint(A, 0.9),
    '--el-color-primary-dark-2': dark ? shade(A, 0.12) : shade(A, 0.2)
  }
}

/* ============================================================
   应用到 <html>
   ============================================================ */
export function clearUiTheme() {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  TOKEN_KEYS.forEach((k) => el.style.removeProperty(k))
}

/**
 * 按当前 <html> 上的 data-ws / data-theme 上色。
 * 没有 data-ws（首页）或该界面没配过色时清掉行内样式，回落到 base.css。
 */
export function applyUiTheme(cfg) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  const ws = el.dataset.ws
  const entry = ws && cfg && cfg[ws]
  // 没配过色的界面一律不覆写 —— 见 activeWs 的说明
  if (!entry || !activeWs.value.has(ws)) {
    clearUiTheme()
    return
  }
  const theme = el.dataset.theme === 'dark' ? 'dark' : 'light'
  const tokens = deriveTokens(entry[theme] || entry.light || {}, theme)
  Object.entries(tokens).forEach(([k, v]) => el.style.setProperty(k, v))
}

/** 当前配置（四个界面全量）。面板绑它做编辑 */
export const uiTheme = ref(clone(DEFAULT_UI_THEME))

/**
 * 只有【保存过配置】的界面才允许覆写行内样式。
 *
 * 为什么必须加这道闸：推导值与原 base.css 里手调的值有 1~10/255 的偏差
 * （--accent-soft 尤其明显 —— 原值是手挑的、色相都不同，无法由主色推出）。
 * 如果默认就给四个界面全量覆写，那三个没人动过配色的工作台外观会跟着变，
 * 属于「改一个功能顺手把别人界面改了」。所以：没配过 → 走 base.css 原值。
 */
const activeWs = ref(new Set())

export function setActiveWorkspaces(list) {
  activeWs.value = new Set(Array.isArray(list) ? list : [])
}

export function isWorkspaceActive(ws) {
  return activeWs.value.has(ws)
}

function clone(o) {
  return JSON.parse(JSON.stringify(o))
}

export function resetUiThemeLocal() {
  uiTheme.value = clone(DEFAULT_UI_THEME)
}

/* ============================================================
   启动：先吃本地缓存（同步，避免首屏闪一下默认色），再去后端拉
   ============================================================ */
const CACHE_KEY = 'ui_theme_cache'

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/* 缓存里要同时存「配置」和「哪些界面配过」。
   只存配置的话，刷新后 activeWs 是空的 → 界面会从自定义色闪回 base.css 默认色。 */
function writeCache() {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ theme: uiTheme.value, active: [...activeWs.value] })
    )
  } catch {
    /* 隐私模式下写不进去，不影响主流程 */
  }
}

/** 把后端返回的配置合并进默认值 —— 后端只存覆盖，缺的字段回落到默认 */
export function mergeTheme(remote) {
  const base = clone(DEFAULT_UI_THEME)
  if (!remote || typeof remote !== 'object') return base
  Object.keys(base).forEach((ws) => {
    const r = remote[ws]
    if (!r || typeof r !== 'object') return
    ;['light', 'dark'].forEach((t) => {
      const rt = r[t]
      if (!rt || typeof rt !== 'object') return
      ;['accent', 'hover', 'highlight'].forEach((k) => {
        // 只接受合法十六进制色 —— 后端是个 JSON 文件，可能被人手改坏
        if (isHex(rt[k])) base[ws][t][k] = rt[k]
      })
    })
  })
  return base
}

/** 后端配置里出现了哪些界面 —— 只有这些允许覆写行内样式 */
export function savedWorkspaces(remote) {
  if (!remote || typeof remote !== 'object') return []
  return Object.keys(DEFAULT_UI_THEME).filter(
    (ws) => remote[ws] && typeof remote[ws] === 'object'
  )
}

/** 拿到后端配置后的统一入口 */
export function applyRemote(remote) {
  uiTheme.value = mergeTheme(remote)
  setActiveWorkspaces(savedWorkspaces(remote))
  applyUiTheme(uiTheme.value)
  writeCache()
}

let initialised = false

export function initUiTheme(fetchRemote) {
  if (initialised || typeof document === 'undefined') return
  initialised = true

  const cached = readCache()
  if (cached) {
    uiTheme.value = mergeTheme(cached.theme)
    setActiveWorkspaces(cached.active || savedWorkspaces(cached.theme))
    applyUiTheme(uiTheme.value)
  }
  // 本机个性化优先：先同步应用一次，避免首屏先是全局默认色再跳成自己的
  applyUserTheme()

  // data-ws 是各布局用 dataset 直接写的、data-theme 由 useTheme 写，
  // 两者都不是响应式的。用 MutationObserver 盯着 <html> 的属性变化重绘，
  // 比让每个布局记得调用一次 applyUiTheme 可靠得多（漏一个地方就是「没生效」）。
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => applyUiTheme(uiTheme.value)).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-ws', 'data-theme']
    })
  }

  // 预置后端拉取。失败就用默认值 —— 不能让后端挂掉导致整个界面不上色。
  if (typeof fetchRemote === 'function') {
    fetchRemote()
      .then((remote) => {
        applyRemote(remote && remote.theme)
        // 全局默认是【底】，用户自己的是【上】：拉回来之后再盖一次，
        // 否则异步到达的全局配置会把本机个性化冲掉。
        applyUserTheme()
      })
      .catch(() => {
        /* 保持缓存/默认值 */
      })
  }
}

/** 保存成功后刷新缓存 */
export function cacheCurrentTheme() {
  writeCache()
}

/* ============================================================
   用户个性化：本机 localStorage、按账号隔离
   ============================================================
   为什么不再用后端那份：ui_theme.json 是【全局】配置，一份管所有人，
   一个人改颜色会改到别人头上 —— 那不叫「个性化」。
   改用 userStorage：它自动把键名前缀成 `<账号>_`，换账号看到的即各自的一套。
   代价是仅本机有效（换浏览器就没了），这是选方案时确认过的取舍。 */
const USER_KEY = 'ui_theme'

export function loadUserTheme() {
  try {
    const raw = getUserItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveUserTheme(cfg) {
  try {
    setUserItem(USER_KEY, JSON.stringify(cfg))
    return true
  } catch {
    return false
  }
}

export function clearUserTheme() {
  try {
    removeUserItem(USER_KEY)
  } catch {
    /* 忽略 */
  }
}

/**
 * 把【当前账号自己】的配色应用上去。
 * 必须排在全局默认之后调用 —— 本机个性化优先；否则异步拉回来的
 * 全局配置会把用户自己调的那套覆盖掉。
 */
export function applyUserTheme() {
  const local = loadUserTheme()
  if (!local) return false
  uiTheme.value = mergeTheme(local)
  setActiveWorkspaces(savedWorkspaces(local))
  applyUiTheme(uiTheme.value)
  return true
}

// 面板改一个色就立刻重绘 —— 实时预览
watch(uiTheme, () => applyUiTheme(uiTheme.value), { deep: true })
