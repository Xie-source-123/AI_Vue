<template>
  <canvas ref="canvasEl" class="wave-bars" aria-hidden="true" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useTheme } from '@/theme/useTheme.js'
import { chartTokens, alpha } from '@/utils/chartTheme.js'

/**
 * 声感条状波：仅在父容器内铺开，随机波幅 / 主频 / 相位 / 二次抖动。
 * 高度上限 0.42 × 容器高，保证波峰不会顶到上方的玻璃块。
 */
const canvasEl = ref(null)
const { isDark } = useTheme()

const DPR = Math.min(window.devicePixelRatio || 1, 2)
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

let ctx = null
let raf = null
let W = 0
let H = 0
let bars = []
let grad = null
let t0 = performance.now()
/* 已建渐变所依据的令牌指纹，以及上次比对的时刻 —— 见 syncGrad */
let tokenSig = ''
let syncedAt = 0
/* 只在「关掉动效偏好」时启用的看门狗定时器 */
let syncTimer = null

function buildBars() {
  const barW = 6
  const gap = 13
  const step = barW + gap
  const count = Math.max(1, Math.ceil(W / step))
  bars = []
  for (let i = 0; i < count; i++) {
    bars.push({
      x: i * step + gap * 0.5,
      w: barW,
      amp: 0.14 + Math.random() * 0.24,
      speed: 0.7 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      wob: 0.6 + Math.random() * 1.8,
      base: 0.03 + Math.random() * 0.05
    })
  }
}

/**
 * 渐变改用主题令牌构建，不再写死颜色。
 * 原来写死的 rgba(197,240,155,…) / rgba(79,157,122,…) 恰好等于
 * --accent-soft / --accent，但那是靠人手保持同步的 —— 改主题色时波浪不会跟随。
 * 走令牌后与登录后的页面零色差，深浅色也自动一致。
 *
 * 浓度一并收淡（底端 0.82 → 0.5，起点 48% → 54%），
 * 否则波浪会在 hero 区底边留下一道浓色硬边，与下方纯白形成跳变。
 *
 * 【为什么还要 syncGrad】canvas 的渐变是「算一次、存下来」的，它不会自己
 * 重读 CSS。只在 onMounted 取一次的话，有两种情况会让波浪停在旧色上：
 *
 *   1. 从工作台返回首页。布局在卸载阶段摘掉 data-ws，而清掉 <html> 上那份
 *      行内令牌的 applyUiTheme 是 MutationObserver 回调（微任务）里跑的 ——
 *      onMounted 正好夹在这两步之间，量到的还是上一套工作台的颜色，而且
 *      行内样式优先级高于样式表，此时连 base.css 的首页绿都盖不过它。
 *      表现就是「首页其余部分已经变绿，唯独波浪还是蓝的」。
 *   2. 样式表热替换（Vite 的 CSS HMR）。只换 <style>，不重挂组件，
 *      自然也不会重建渐变。
 *
 * 所以缓存一份令牌指纹，在绘制循环里低频比对：变了才重建，没变时
 * 代价只有一次 getComputedStyle。
 */
function tokenSignature(t) {
  return `${t.accent}|${t.accentSoft}`
}

function buildGrad() {
  if (!ctx) return
  const t = chartTokens()
  tokenSig = tokenSignature(t)
  grad = ctx.createLinearGradient(0, H * 0.54, 0, H)
  grad.addColorStop(0, alpha(t.accentSoft, 0))
  grad.addColorStop(0.45, alpha(t.accentSoft, 0.45))
  grad.addColorStop(1, alpha(t.accent, 0.5))
}

/** 令牌变了才重建，返回是否真的重建了。容器尺寸变化不走这里 ——
 *  渐变终点是 H，那条路（resize）必须强制重建。 */
function syncGrad() {
  if (!ctx) return false
  if (tokenSignature(chartTokens()) === tokenSig) return false
  buildGrad()
  return true
}

/** 比对间隔。300ms 足够快（肉眼当作同时发生），又不至于每帧都读计算样式。 */
const SYNC_MS = 300

function resize() {
  const el = canvasEl.value
  if (!el) return
  W = el.clientWidth
  H = el.clientHeight
  el.width = Math.round(W * DPR)
  el.height = Math.round(H * DPR)
  ctx = el.getContext('2d')
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  buildGrad()
  buildBars()
}

function draw(now) {
  if (!ctx) return
  /* 低频比对令牌：从工作台返回首页、或样式表被热替换时，波浪自己跟上，
     不再需要手动刷新（详见 syncGrad 的说明）。 */
  if (now - syncedAt > SYNC_MS) {
    syncedAt = now
    syncGrad()
  }
  const tt = (now - t0) / 1000
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = grad
  for (const b of bars) {
    const k = 0.5 + 0.5 * Math.sin(tt * b.speed + b.phase)
    const wobble = 0.72 + 0.28 * Math.sin(tt * b.wob + b.phase * 1.7)
    const h = Math.min(H * 0.42, H * (b.base + b.amp * k * wobble))
    ctx.fillRect(b.x, H - h, b.w, h)
  }
  if (!reduceMotion) raf = requestAnimationFrame(draw)
}

function onResize() {
  if (canvasEl.value) resize()
}

onMounted(() => {
  resize()
  raf = requestAnimationFrame(draw)
  window.addEventListener('resize', onResize)
  /* 关掉动效偏好时上面的绘制循环只跑一帧，没有地方做令牌比对 ——
     补一个低频看门狗，否则「从工作台返回首页」这一路仍会停在旧色上。
     只有令牌真的变了才重绘那一帧。 */
  if (reduceMotion) {
    syncTimer = setInterval(() => {
      if (syncGrad()) draw(performance.now())
    }, SYNC_MS)
  }
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = null
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = null
  window.removeEventListener('resize', onResize)
})

/* 主题切换时重建渐变 —— 令牌值随主题变化，重新读一次即可，
   不再需要在组件里手写深色分支 */
watch(isDark, () => buildGrad())
</script>

<style scoped>
.wave-bars {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  display: block;
}
</style>
