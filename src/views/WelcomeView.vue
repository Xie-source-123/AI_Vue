<template>
  <div class="landing">
    <!-- ===== 顶部导航 ===== -->
    <header class="lp-nav">
      <div class="lp-brand" @click="scrollTop">
        <span class="mark" aria-hidden="true" />
        <b>节点</b>
        <i>NODE</i>
      </div>
      <div class="lp-navlinks">
        <a @click="go('/app/interview')">工作台</a>
        <a @click="go('/app/data')">数据</a>
        <a @click="openAuth('login')">登录</a>
        <button
          class="lp-theme"
          :data-tip="isDark ? '切换到浅色模式' : '切换到深色模式'"
          data-tip-pos="bottom"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleTheme"
        >
          <el-icon :size="16"><component :is="isDark ? Sunny : Moon" /></el-icon>
        </button>
        <button class="lp-nav-cta" @click="openAuth('register')">免费体验</button>
      </div>
    </header>

    <!-- ===== 英雄带：不对称标题 + 环形玻璃块 + 条状波 ===== -->
    <section class="hero-band">
      <!-- LOGO 背景水印：左右不对称，外加右下角一块巨大的。
           放在 WaveBars 之前 —— 两者都在 z-index:0 层，DOM 顺序决定前后，
           水印在先意味着波纹会盖在它上面，水印下半截被波浪柔化掉，
           这正是「烙印在纸背」而不是「贴在上面的贴纸」的观感。
           右下角那块是与工作台 WorkspaceLayout、管理后台 AdminLayout 的
           .wm-big 用同一组数值，三个界面在这个位置看到的是同一个水印。 -->
      <span class="lp-wm lp-wm-left" aria-hidden="true" />
      <span class="lp-wm lp-wm-right" aria-hidden="true" />
      <span class="lp-wm lp-wm-big" aria-hidden="true" />

      <WaveBars />
      <div class="hero">
        <div class="hero-left">
          <span class="eyebrow">结构化面试训练</span>
          <h1 class="hero-title">
            <span class="l1"><em>节点</em></span>
            <span class="l2">开启你的面试之旅吧</span>
          </h1>
          <p class="sub">上传简历、选定岗位，面试官针对你的背景定制提问、逐题打分。</p>
          <div class="hero-actions">
            <button class="btn primary" @click="openAuth('register')">免费开始</button>
            <button class="btn" @click="scrollTo('examples')">查看示例</button>
          </div>
          <div class="prompt-bar" @click="openAuth('register')">
            <span class="pdot"></span>
            <span>数据开发工程师 · 性能优化场景</span>
            <button>生成</button>
          </div>
        </div>

        <div class="hero-right">
          <div class="arc-hint">六大训练板块 · 每 2.2 秒自动切换</div>
          <div
            ref="stageEl"
            class="arc-stage"
            :style="{ '--fan-shift': FAN_SHIFT_CM + 'cm' }"
            @mouseenter="pauseAuto"
            @mouseleave="resumeAuto"
          >
            <div class="arc-ring">
              <div
                v-for="(c, i) in ARC"
                :key="c.t"
                class="arc-card"
                :class="{ 'is-front': i === arcIndex }"
                :style="cardStyle(i)"
                @click="selectCard(i)"
              >
                <div class="ic">{{ c.ic }}</div>
                <h3>{{ c.t }}</h3>
                <div v-if="c.chips" class="chips-mini">
                  <span v-for="x in c.chips" :key="x">{{ x }}</span>
                </div>
                <p v-else-if="c.quote" class="quote">{{ c.quote }}</p>
                <p v-else>{{ c.d }}</p>
                <span class="tag">{{ c.tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 问题示例 ===== -->
    <section id="examples" class="lp-section">
      <div class="lp-inner">
        <div class="lp-head">
          <h2>问题示例</h2>
          <p>从你的简历与岗位画像生成的真实提问，每题都有明确的考察意图与评分维度。</p>
        </div>
        <div class="ex-list">
          <div v-for="(e, i) in examples" :key="i" class="ex-row">
            <span class="ex-idx">{{ String(i + 1).padStart(2, '0') }}</span>
            <p>{{ e.q }}</p>
            <span class="pill">{{ e.tag }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 底部 CTA ===== -->
    <section class="final">
      <h2>现在，开始你的第一场。</h2>
      <p>注册即送体验积分，无需绑定支付。</p>
      <button class="btn primary" @click="openAuth('register')">立即开始</button>
    </section>

    <footer class="lp-foot">
      <div class="lp-foot-inner">
        <span>节点 NODE</span>
        <span>© 2026 结构化面试训练</span>
      </div>
    </footer>

    <AuthModal v-model:visible="authVisible" :initial-mode="authMode" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sunny, Moon } from '@element-plus/icons-vue'
import AuthModal from '@/components/AuthModal.vue'
import WaveBars from '@/components/WaveBars.vue'
import { useTheme } from '@/theme/useTheme.js'
/* 品牌图形由 CSS 的 mask 引用（见 .lp-brand .mark），不需要 import */

const router = useRouter()
/* 主题在着陆页本来就已生效（useTheme 的 watchEffect 是模块级，
   WaveBars 已经 import 过它），这里只是为了拿到 isDark / toggle 驱动按钮。 */
const { isDark, toggle: toggleTheme } = useTheme()
const go = (path) => router.push(path)

const authVisible = ref(false)
const authMode = ref('login')
const openAuth = (mode) => {
  authMode.value = mode
  authVisible.value = true
}
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

/* ---------- 环形玻璃块 ---------- */
const ARC = [
  { ic: '⌘', t: '算法', tag: '技术面', d: '从复杂度、边界条件到优化思路层层递进，追问到你讲不出为止。' },
  { ic: '◫', t: '系统设计', tag: '架构面', d: '存储组件、削峰策略与一致性权衡，按真实系统规模追问。' },
  { ic: '▤', t: '项目深挖', tag: '简历面', d: '结合你简历里的真实项目持续追问细节与取舍。' },
  { ic: '◍', t: '行为面', tag: '综合面', d: '跨团队冲突、优先级取舍与复盘能力，按岗位画像考察。' },
  { ic: '▦', t: '岗位方向', tag: '6 个方向', chips: ['数据开发', 'Linux 服务器', '后端', '前端', '算法', '测试'] },
  { ic: '❝', t: '问题示例', tag: '真实提问', quote: '请描述你在项目中做过的一次性能优化，以及如何衡量收益。' }
]

/* ---------- 扇形玻璃块：几何 ---------- */
const SPREAD = 8
const OFFSET = 86
const DROP = 6
const MAX_ROT = 20
const CARD_W = 260
const CARD_H = 120
/* 支点在卡片下方 150%（transform-origin: 50% 150%）—— 正是这个偏下支点造成
   了扇形：旋转让卡片绕该点摆动，同时把它抬高一点。
   相对卡片中心的下移量 = 1.5×120 − 60 = 120px。 */
const PIVOT_Y = CARD_H * 1.5 - CARD_H / 2
/* 扇形原点在舞台中的位置。原设计是 54% / 34% —— 但那个位置有个问题：
   扇形本身是右重左轻的（右 +408.65 / 左 −325.63，见 fanBox 的用法），
   原点又偏右，于是右侧先顶住，缩放被迫压到 0.834。
   移到 48% / 30% 后，包围盒（734px）恰好卡满列宽（787px），
   缩放能放到接近 1，也就是接近原始尺寸。 */
const FAN_ORIGIN_X = 0.48
const FAN_ORIGIN_Y = 0.30
/* 左右余量刻意不同：右侧要"贴近空白边缘"所以只留 2px，左侧留 10px 呼吸。
   原代码这里是一个 M=10 的对称余量，改成两个方向分开。 */
const FAN_PAD_IN = 10
const FAN_PAD_OUT = 2

/* ---------- 整体右移量 ----------
   CSS 里 1cm = 96px / 2.54 ≈ 37.795px，所以 2cm = 75.59px —— CSS 侧直接用 cm
   写，JS 侧用同一个常量换算成 px 参与适配计算，避免"CSS 写 2cm、JS 写 75px"
   这种两处数值（这个错我在本项目里犯过）。 */
const CM = 96 / 2.54
const FAN_SHIFT_CM = 2
const FAN_SHIFT_PX = FAN_SHIFT_CM * CM

/* 扇形包围盒：遍历 6 张卡算出真实外沿，不手填数字 —— 改 OFFSET / SPREAD /
   MAX_ROT 时包围盒会自动跟着变，自适应缩放才不会与几何脱节。 */
const fanBox = (() => {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const N = ARC.length
  for (let i = 0; i < N; i++) {
    let d = i
    if (d > N / 2) d -= N
    const abs = Math.abs(d)
    const rad = (Math.max(-MAX_ROT, Math.min(MAX_ROT, d * SPREAD)) * Math.PI) / 180
    const sc = abs === 0 ? 1 : Math.max(0.76, 1 - abs * 0.06)
    /* 卡片中心 = 平移 + 绕偏下支点旋转后的位移
       （rotate ∘ scale 作用在相对支点的 (0, −PIVOT_Y) 上） */
    const cx = d * OFFSET + sc * PIVOT_Y * Math.sin(rad)
    const cy = abs * DROP + PIVOT_Y * (1 - sc * Math.cos(rad))
    /* 旋转矩形的轴对齐半宽 / 半高 */
    const hw = sc * ((CARD_W / 2) * Math.abs(Math.cos(rad)) + (CARD_H / 2) * Math.abs(Math.sin(rad)))
    const hh = sc * ((CARD_H / 2) * Math.abs(Math.cos(rad)) + (CARD_W / 2) * Math.abs(Math.sin(rad)))
    minX = Math.min(minX, cx - hw)
    maxX = Math.max(maxX, cx + hw)
    minY = Math.min(minY, cy - hh)
    maxY = Math.max(maxY, cy + hh)
  }
  return { minX, maxX, minY, maxY }
})()
const arcIndex = ref(0)

/* ---------- 自动轮播 ---------- */
const AUTO_MS = 2200
let timer = null

function stopAuto() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function advance() {
  arcIndex.value = (arcIndex.value + 1) % ARC.length
}

function startAuto() {
  stopAuto()
  timer = window.setInterval(advance, AUTO_MS)
}

/* 点击选卡后重置计时，否则刚选完可能立刻被定时器切走 */
function selectCard(i) {
  arcIndex.value = i
  startAuto()
}

/* 悬停暂停：让用户能停下来把卡片上的描述读完 */
const pauseAuto = stopAuto
const resumeAuto = startAuto

/* 尊重系统的「减少动态效果」：持续自动轮播正属于应被关闭的动效 */
const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

/* ---------- 环的自适应缩放 ----------
   .hero-right 是 grid 的 1.32fr 列：视口在 1000–1340px 之间时列宽会从
   574px 连续收到 787px。用 ResizeObserver 读舞台实宽再整体缩放圆环，
   比补媒体查询准 —— 媒体查询只能覆盖断点，管不到中间的连续区间。 */
const stageEl = ref(null)
let ro = null

function fitRing() {
  const el = stageEl.value
  if (!el) return
  const w = el.clientWidth
  const h = el.clientHeight
  if (!w || !h) return
  /* 扇形下沿的绝对上限（相对舞台顶）由 CSS 的 --arc-fan-bottom 给出，
     含断点差异，这里读回来而不是再写一份常量 */
  const limit = parseFloat(getComputedStyle(el).getPropertyValue('--arc-fan-bottom')) || 313
  /* 原点 + 整体右移量 */
  const ox = w * FAN_ORIGIN_X + FAN_SHIFT_PX
  const oy = h * FAN_ORIGIN_Y
  /* .hero-right 只是 grid 的一列，扇形是绝对定位，可以越过它。
     真正的右边界是 .hero-band 的右边缘 —— band 铺满视口且有 overflow:hidden，
     所以等于视口右边缘。宽屏下 hero 被 max-width:1340px 居中，这一列右侧还
     剩一大段；不把这段算进来，2cm 平移会被误判成溢出、整个扇形被缩小。 */
  const roomRight = Math.max(
    0,
    document.documentElement.clientWidth - el.getBoundingClientRect().right
  )
  /* 四个方向各算一个上限再取最小。右侧 = 本列余量 + 列外余量。 */
  const s = Math.min(
    1,
    Math.max(
      0.3,
      Math.min(
        (ox - FAN_PAD_IN) / -fanBox.minX,
        (w - ox - FAN_PAD_OUT + roomRight) / fanBox.maxX,
        (oy - FAN_PAD_IN) / -fanBox.minY,
        (limit - oy) / fanBox.maxY
      )
    )
  )
  el.style.setProperty('--arc-scale', s.toFixed(3))
}

onMounted(() => {
  fitRing()
  if (typeof ResizeObserver !== 'undefined' && stageEl.value) {
    ro = new ResizeObserver(fitRing)
    ro.observe(stageEl.value)
  }
  if (!prefersReduced) startAuto()
})
/* 定时器与观察器都必须显式清理：路由切走后它们不会自己停 */
onUnmounted(() => {
  stopAuto()
  if (ro) {
    ro.disconnect()
    ro = null
  }
})

/* 扇形排布：把索引差归一到 [−N/2, N/2]，这样索引从 5 走到 0 时差值是 +1
   而不是 −5，扇形才会「前进一格」而不是「倒退五格」。 */
function cardStyle(i) {
  const N = ARC.length
  let dd = i - arcIndex.value
  if (dd > N / 2) dd -= N
  if (dd < -N / 2) dd += N
  const abs = Math.abs(dd)
  const isFront = dd === 0
  const x = dd * OFFSET
  const y = abs * DROP
  const rot = Math.max(-MAX_ROT, Math.min(MAX_ROT, dd * SPREAD))
  const scale = isFront ? 1 : Math.max(0.76, 1 - abs * 0.06)
  return {
    transform:
      `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ` +
      `rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`,
    opacity: isFront ? 1 : Math.max(0.45, 0.9 - abs * 0.13).toFixed(2),
    filter: isFront ? 'none' : `blur(${(0.4 + abs * 0.5).toFixed(1)}px)`,
    zIndex: String(60 - abs)
  }
}
const examples = [
  { q: '请描述你在项目中做过的一次性能优化，以及如何衡量收益。', tag: '数据开发' },
  { q: '如果服务出现大量慢查询，你会如何定位并解决？', tag: 'Linux 服务器' },
  { q: '讲讲你最有挑战的一次跨团队协作，冲突是如何解决的。', tag: '行为面' }
]
</script>

<style scoped>
.landing {
  /* 导航尺寸抽成变量：.lp-nav 的 top/height/margin 与 .hero-band 的
     反向上移量、padding-top 都要用它算。写死 74px 会在四处重复，
     改一处忘一处，首屏就会出现错位或白边 */
  --nav-h: 60px;
  --nav-gap: 14px;
  /* 行楷字族。顺序是刻意的：
     1) STXingkai / 华文行楷 —— 本机这类 Windows+Office 环境装了的优先用它，字形最正；
     2) Ma Shan Zheng —— 开源（OFL）毛笔楷书，由 index.html 的 Google Fonts 引入，
        没装华文行楷的设备退到这里，不会掉成系统默认的黑体；
     3) KaiTi / 楷体 / STKaiti —— 再退一档，中文系统基本都带；
     4) cursive —— 最后的通用兜底。
     注意：行楷是单字重字体，下面各处一律用 font-weight: 400，
     设成 700 会触发浏览器合成加粗，把笔画糊成一团。 */
  --font-kai: 'STXingkai', '华文行楷', 'Ma Shan Zheng', 'KaiTi', '楷体', 'STKaiti', cursive;
  min-height: 100vh;
  color: var(--ink);
  /* 自下而上晕开一层淡草木绿。刻意用不透明的 --canvas 打头而不是 transparent，
     避免 transparent → 有色 的插值在某些渲染路径下出现灰带。
     绿色起点从 46% 提前到 34%：hero 区在页面约 40% 处就结束，
     原来 46% 才启动意味着 hero 下方是一片纯白，与波浪底边形成硬跳变。 */
  background: linear-gradient(
    180deg,
    var(--canvas) 0%,
    var(--canvas) 34%,
    var(--accent-wash) 72%,
    var(--accent-wash-2) 100%
  );
}

/* ===== 顶部导航 ===== */
/* 浮动胶囊导航：脱离顶部、四周留白、全圆角，与页脚形成「玻璃上盖 + 玻璃底座」 */
.lp-nav {
  position: sticky;
  top: var(--nav-gap);
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: var(--nav-h);
  padding: 0 10px 0 22px;
  max-width: 1200px;
  margin: var(--nav-gap) auto 0;
  background: var(--glass-panel);
  border: 1px solid var(--hairline);
  border-radius: 999px;
  backdrop-filter: blur(32px) saturate(170%);
  -webkit-backdrop-filter: blur(32px) saturate(170%);
  box-shadow: var(--shadow-md), inset 0 1px 0 var(--sheen), inset 0 14px 28px -22px var(--sheen);
}
.lp-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
}
/* 品牌块：实心主题色圆 + 镂空线条。
   做法是把「实心圆减去墨迹」的遮罩用 mask 盖在实心色块上，线条处变成真正的透明 ——
   透出的是背后顶栏的底色，而不是叠一层白色像素，这就是「镂空」与「画白线」的区别。
   因此这里不需要 <img>：元素本身就是最终图形。
   遮罩里已经画好了圆，border-radius 只是遮罩万一加载失败时的兜底形状。 */
.lp-brand .mark {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  background: var(--accent);
  border-radius: 50%;
  -webkit-mask-image: url('../assets/logo-mark-cutout.png');
  mask-image: url('../assets/logo-mark-cutout.png');
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
.lp-brand b {
  font-family: var(--font-kai);
  color: var(--ink);
  /* 15px → 20px：行楷的字面比无衬线小，同样字号看起来小一号，
     20px 视觉上大约相当于无衬线的 17–18px */
  font-size: 20px;
  /* 单字重字体，600 会触发合成加粗 */
  font-weight: 400;
  letter-spacing: 0.04em;
  line-height: 1;
}
.lp-brand i {
  font-family: var(--font-mono);
  font-style: normal;
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--accent);
}
.lp-navlinks {
  display: flex;
  align-items: center;
  gap: 24px;
}
.lp-navlinks a {
  font-size: 13px;
  color: var(--body);
  cursor: pointer;
}
.lp-navlinks a:hover {
  color: var(--accent-hover);
}
.lp-nav-cta {
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(24px) saturate(165%);
  -webkit-backdrop-filter: blur(24px) saturate(165%);
  transition: var(--slide-trans);
}

/* ===== 深浅模式切换 =====
   34px = 16px 图标 + 上下各 9px，正好与 .lp-navlinks 里 13px 字号的行高对齐，
   不会把导航撑高。材质沿用 CTA 那套玻璃语言，不引入新材料。 */
.lp-theme {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hairline);
  border-radius: var(--rad-pill);
  background: var(--btn-glass);
  color: var(--body);
  cursor: pointer;
  backdrop-filter: blur(24px) saturate(165%);
  -webkit-backdrop-filter: blur(24px) saturate(165%);
  box-shadow: inset 0 1px 0 var(--sheen);
  transition: var(--slide-trans);
}

.lp-theme:hover {
  background: var(--btn-glass-hover);
  border-color: var(--accent-line);
  color: var(--accent-hover);
}

.lp-theme:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.lp-theme:active {
  transform: translateY(1px) scale(0.94);
  transition-duration: var(--dur-fast);
}

/* ===== 英雄带 ===== */
/* 新-1：背景直达页面顶部（y=0），导航浮在其上。
   做法是反向上移「导航高 + 上边距」的距离，再用等量 padding-top 把内容推回
   导航下方 —— 一负一正相抵，区块总占用高度不变，但背景从页面最顶端开始铺。
   （撤销了上次的 min-height 撑满：那会把区块拉到约 950px，
     而渐变原本 64% 就透明了，导致下方约 340px 整片留白。） */
.hero-band {
  position: relative;
  overflow: hidden;
  margin-top: calc(-1 * (var(--nav-h) + var(--nav-gap)));
  padding-top: calc(var(--nav-h) + var(--nav-gap));
  border-bottom: 1px solid var(--hairline);
  /* 首屏 = 一屏：让「问题示例」正好从折叠线以下开始。
     为什么这里量出来是对的：.lp-nav 有 margin-top: 14px、高 60px，
     在流里占到 y=74；band 的 margin-top: -74px 把它拉回 y=0。
     所以 band 从 y=0 起、撑满一屏，它的下沿就正好落在折叠线上。

     用 svh 而不是 vh：移动端地址栏收起/展开会改变 vh，页面会跟着跳；
     svh 取的是「地址栏展开时」的最小视口高，稳定。
     前一行 vh 是给不支持 svh 的浏览器的回退。
     注意：这是 min-height，内容比一屏高时（窄屏堆叠布局）由内容撑开，
     此时 band 更高、示例仍在线下，两种情况下都不会露出来。 */
  min-height: 100vh;
  min-height: 100svh;
  /* 改用登录后壳（.shell）同款的双径向光斑替代线性渐变：
     光斑边界柔和、没有硬边，不会在区块底边留下一条色带 */
  background-image: radial-gradient(1100px 640px at 6% -6%, var(--shell-glow), transparent 68%),
    radial-gradient(900px 560px at 102% 104%, var(--shell-glow), transparent 66%),
    linear-gradient(135deg, var(--accent-wash), transparent 62%);
}
[data-theme='dark'] .hero-band {
  /* 黑底上这块绿色洗色要更淡：0.12 会在顶部压出一条明显色带 */
  background: linear-gradient(180deg, rgba(127, 212, 160, 0.07), rgba(0, 0, 0, 0) 64%);
}

/* ===== 背景水印（纯线条形态）=====
   为什么用 mask 而不是 <img>：logo-mark.png 是「黑墨 + 透明」的位图，
   直接当图片插入只能是黑的，深色模式下就成了一团看不见的黑。
   套上 mask 再用 background 上色，图形就会跟着 --accent 走 ——
   浅色下是草木青、深色下自动变成浅绿，与全站同一套令牌。

   左右刻意不对称：左边大且偏上、被左边缘裁掉一截；右边小且偏下、完整。
   两个都靠边缘出血，中间留出干净的阅读区，不会压到标题和扇形。 */
.lp-wm {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  background: var(--accent);
  -webkit-mask-image: url('../assets/logo-mark.png');
  mask-image: url('../assets/logo-mark.png');
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
.lp-wm-left {
  width: 520px;
  height: 520px;
  left: -150px;
  top: 6%;
  transform: rotate(-8deg);
  opacity: 0.13;
}
/* 右上角这块小的（原来是右侧偏下、470px）。
   一路缩下来 470 → 300 → 170，并从中右侧挪到右上角，原因是右下角那块
   640px 的巨大块改成了「完整显示、不出血」—— 它不再躲到屏幕外，
   而是整个回到了画面里，正好顶进这块原来占的地盘。
   两块都在右侧、水平只差两三百像素，靠调垂直位置是拉不开的，
   所以改成「右上角小块 + 右下角大块」对角布置。
   用 right: 32px 而不是保留出血：这样它自己也是完整的。
   实测（视口宽 1600）：700px 高时还差 60px 边缘重叠，768px 降到 18px，
   800px 以上基本不碰。留着出血能在 700px 上少 60px 重叠，但会裁掉
   标志右缘约 31px（直径的 18%）—— 「看得出被裁」比「边缘轻微叠色」扎眼，
   所以这里选完整显示。 */
.lp-wm-right {
  width: 170px;
  height: 170px;
  right: 32px;
  top: 10%;
  transform: rotate(14deg);
  opacity: 0.1;
}

/* 右下角那块「巨大」的。
   与工作台 WorkspaceLayout、管理后台 AdminLayout 的 .wm-big 是同一组数值 ——
   从首页进工作台、再进后台，它始终在同一位置、同一大小、同一浓淡。

   完整显示、不出血：之前贴边出血时只能看到圆形的左上四分之一，
   用户看到的就是「只看到一点」。现在 640px + 留 32px 边距，整个标志可见。
   尺寸从 900 收到 640 是配套的 —— 640 + 32 = 672，在 900px 高的屏上不顶到上边。
   旋转 -8° 不会裁到墨迹：旋转后外接框比盒子大 41px，但标志是内切圆
   （半径约 0.45×640 = 288），圆心距各边 352px，288 < 352，留有余量。 */
.lp-wm-big {
  width: 640px;
  height: 640px;
  right: 32px;
  bottom: 32px;
  transform: rotate(-8deg);
  opacity: 0.18;
}

.hero {
  position: relative;
  z-index: 1;
  max-width: 1340px;
  margin: 0 auto;
  padding: 52px 32px 56px;
  display: grid;
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.32fr);
  gap: 24px;
  align-items: start;
}

.hero-left {
  padding-top: 26px;
}
.hero-left .eyebrow {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--accent);
}
.hero-title {
  font-family: var(--font-kai);
  font-size: clamp(34px, 4.8vw, 58px);
  /* 行楷只有单一字重：设 700 会触发合成加粗，行笔的粗细变化被糊掉 */
  font-weight: 400;
  /* 原来的 -0.04em 是给无衬线体调的负字距。书法字体的笔画本来就向外
     舒展并相互连带，负字距会让字粘在一起，这里改成轻微正字距。 */
  letter-spacing: 0.02em;
  /* 1.03 在无衬线体上刚好，但书法的字面框上下都更满，
     再加上里面有个 1.4em 的大字，行距必须放开，否则两行会叠上。 */
  line-height: 1.2;
  margin-top: 14px;
  color: var(--ink);
}
.hero-title span {
  display: block;
}
.hero-title .l2 {
  margin-left: 1.6em;
  /* 原来这里是 0.94em（跟着标题的 clamp(34px,4.8vw,58px) 走），
     在 1440px 下等于 54.5px，而这一行「9 个全角字 + 1.6em 缩进」
     共需 10.6 倍字号 = 578px，远超左列的 465px 可用宽度 —— 这就是它折行的原因。

     改用视口单位独立定字号：左列可用宽度 = 0.3714 × (100vw - 88)，
     除以 10.6 解出字号上限约 3.50vw - 3.1px。这里取 3.1vw 并在最宽档封顶 42px，
     留出足够余量。逐档实测（占用 / 可用，px）：
       1920+ → 445 / 465      1340 → 440 / 465
       1200  → 394 / 413      1100 → 362 / 376
       1024  → 328 / 348      ≤1000 → 单列布局，整行宽度可用

     别把上限往 48px 调：那是按「8 个字」算出来的，实际是 9 个字，
     用 48px 会在所有桌面宽度下顶出容器 40px 以上。 */
  font-size: clamp(22px, 3.1vw, 42px);
  letter-spacing: 0.02em;
  /* 死锁不换行：这一行必须一行放下。
     字号已按上面的余量算过，nowrap 是最后一道保险 ——
     万一装不下，它会溢出而【不是】折行，这也正是「一行」的本意。 */
  white-space: nowrap;
}
/* 「节点」：放大 1.4 倍 + 渐变裁切。
   行高单独收紧 —— 否则这个大字的行框会把第一行撑得很高，
   与下面那行的间距变得忽大忽小。 */
.hero-title em {
  font-style: normal;
  font-size: 1.4em;
  line-height: 1.1;
  letter-spacing: 0;
  background: linear-gradient(100deg, var(--accent-soft), var(--accent) 55%, var(--accent-hover));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero .sub {
  font-size: 15px;
  line-height: 1.75;
  color: var(--body);
  margin: 20px 0 26px;
  max-width: 34ch;
}
.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}
/* 按钮统一毛玻璃 + 胶囊圆角（与胶囊导航呼应）。
   次要按钮用白玻璃，主按钮用强调色描边 + 20% 强调色底（见下方共用规则）。 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  background: var(--btn-glass);
  backdrop-filter: blur(24px) saturate(165%);
  -webkit-backdrop-filter: blur(24px) saturate(165%);
  box-shadow: inset 0 1px 0 var(--sheen);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}
.btn:hover {
  border-color: var(--accent-line);
  background: var(--btn-glass-hover);
}

/* 主按钮的玻璃强调色处理：.btn.primary / 导航 CTA / 快捷提问按钮三者共用，
   避免同一套样式写三遍。 */
.btn.primary,
.lp-nav-cta,
.prompt-bar button {
  background: linear-gradient(135deg, var(--accent-wash-2), var(--accent-wash));
  border: 1px solid var(--accent-line);
  color: var(--accent-hover);
  box-shadow: inset 0 1px 0 var(--sheen), 0 4px 14px var(--accent-wash);
}

.btn.primary:hover,
.lp-nav-cta:hover,
.prompt-bar button:hover {
  border-color: var(--accent);
  background: var(--accent-wash-2);
}
/* 全胶囊 + 强柔光玻璃。
   内边距左 16→24：约 50px 高的胶囊圆弧半径 25px，文字要离端点 25px 才不贴边。 */
.prompt-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 24px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--glass-strong);
  backdrop-filter: blur(34px) saturate(180%);
  -webkit-backdrop-filter: blur(34px) saturate(180%);
  box-shadow: inset 0 1px 0 var(--sheen), inset 0 18px 36px -26px var(--sheen),
    0 10px 30px -18px var(--accent-wash);
  cursor: pointer;
  max-width: 420px;
  transition: var(--slide-trans);
}

.prompt-bar .pdot {
  width: 8px;
  height: 8px;
  background: var(--grad-accent);
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px var(--accent-wash);
}
.prompt-bar span {
  flex: 1;
  font-size: 13px;
  color: var(--body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prompt-bar button {
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  backdrop-filter: blur(24px) saturate(165%);
  -webkit-backdrop-filter: blur(24px) saturate(165%);
  transition: var(--slide-trans);
}

/* ===== 右侧扇形玻璃块 ===== */
.hero-right {
  display: flex;
  flex-direction: column;
  height: 620px;
  min-width: 0;
}
.arc-hint {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--body-muted);
  text-align: right;
  padding-right: 8px;
}
.arc-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  /* 扇形下沿的绝对上限（相对舞台顶）。原设计的扇形在 100% 尺寸下会压进
     底部的条状波：band 高 802 时波峰顶边在 325px，留 12px 净空 → 313px。
     断点下 band 变矮，这个值要跟着收。 */
  --arc-fan-bottom: 313px;
}
/* ===== 扇形玻璃块 =====
   原点在舞台的 54% / 34%；卡片支点偏下 150%（transform-origin: 50% 150%），
   两者配合才形成扇形。--arc-scale 由 fitRing 按容器实宽/实高与波浪上限写入。 */
.arc-ring {
  position: absolute;
  /* 必须与 JS 的 FAN_ORIGIN_X / FAN_ORIGIN_Y / FAN_SHIFT_CM 一致 ——
     自适应缩放是以这个原点为基准算四个方向余量的，两处不一致会把扇形推歪。
     --fan-shift 由 JS 的 FAN_SHIFT_CM 注入（当前 2cm ≈ 75.59px）。 */
  left: calc(48% + var(--fan-shift, 2cm));
  top: 30%;
  width: 0;
  height: 0;
  transform: scale(var(--arc-scale, 1));
}
.arc-card {
  position: absolute;
  left: 0;
  top: 0;
  /* 支点偏下 150% —— 扇形的来源。改回 50% 50% 就变成平铺 */
  transform-origin: 50% 150%;
  width: 260px;
  height: 120px;
  margin: -60px 0 0 -130px;
  padding: 15px 18px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  /* 材质与着陆页主按钮同源：玻璃在上、按钮同款绿在下。
     全部走令牌，深浅色自动承接，不需要手写深色分支。 */
  background: var(--glass-strong),
    linear-gradient(135deg, var(--accent-wash-2), var(--accent-wash));
  border: 1px solid var(--accent-line);
  border-radius: var(--rad-block);
  backdrop-filter: blur(26px) saturate(170%);
  -webkit-backdrop-filter: blur(26px) saturate(170%);
  box-shadow: inset 0 1px 0 var(--sheen), 0 10px 26px -16px var(--accent-wash);
  color: var(--ink);
  cursor: pointer;
  /* 0.6s：自动间隔 2.2s，过渡再长会显得拖沓 */
  transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.6s ease,
    filter 0.6s ease, box-shadow 0.6s ease, border-color 0.6s ease;
  will-change: transform, opacity, filter;
}
.arc-card::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-line), transparent);
  opacity: 0.7;
}
.arc-card .ic {
  position: absolute;
  right: 16px;
  top: 14px;
  width: 26px;
  height: 26px;
  border: 1px solid var(--accent-line);
  border-radius: var(--rad-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-hover);
  font-size: 13px;
}
.arc-card h3 {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  padding-right: 34px;
  color: var(--ink);
}
.arc-card p {
  font-size: 11px;
  line-height: 1.6;
  color: var(--body);
  max-width: 30ch;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.arc-card .tag {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-hover);
  margin-top: 2px;
}
.arc-card .chips-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 30ch;
}
.arc-card .chips-mini span {
  font-family: var(--font-mono);
  font-size: 8.5px;
  padding: 2px 5px;
  border: 1px solid var(--accent-line);
  border-radius: 2px;
  color: var(--body);
}
.arc-card .quote {
  font-size: 11px;
  line-height: 1.6;
  color: var(--ink);
}
/* 当前卡：描边提亮 + 绿色光晕 */
.arc-card.is-front {
  border-color: var(--accent);
  box-shadow: inset 0 1px 0 var(--sheen), 0 12px 30px -14px var(--accent-wash-2);
}
.arc-card.is-front h3 {
  font-size: 17px;
}
.arc-card.is-front p,
.arc-card.is-front .quote {
  font-size: 12px;
}
/* ===== 问题示例 ===== */
.lp-section {
  padding: 64px 32px;
  border-bottom: 1px solid var(--hairline);
}
.lp-inner {
  max-width: 1200px;
  margin: 0 auto;
}
.lp-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 32px;
  align-items: end;
  margin-bottom: 32px;
}
.lp-head h2 {
  font-family: var(--font-kai);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 400;
  letter-spacing: 0.02em;
  /* 书法的字面框上下都更满，原来给无衬线体的 1.1 会顶到下一行 */
  line-height: 1.24;
  color: var(--ink);
}
.lp-head p {
  font-size: 14px;
  line-height: 1.7;
  color: var(--body-muted);
  padding-bottom: 4px;
}
.ex-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* 与卡片体系同源的浅玻璃，不再是实色平面 */
/* 全胶囊 + 强柔光玻璃。内边距左右 20→28：约 56px 高的胶囊圆弧半径 28px。
   min-height 锁住单行高度，保证两端始终是规整的半圆而不是被折行撑成大圆弧。 */
.ex-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 14px 28px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--glass-strong);
  backdrop-filter: blur(34px) saturate(180%);
  -webkit-backdrop-filter: blur(34px) saturate(180%);
  box-shadow: inset 0 1px 0 var(--sheen), inset 0 18px 36px -26px var(--sheen),
    0 10px 30px -18px var(--accent-wash);
  transition: var(--slide-trans);
}
.ex-idx {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent);
  width: 24px;
  flex-shrink: 0;
}
/* 强制单行：超长题目优雅截断，而不是把整行撑出横向滚动条。
   min-width: 0 是 flex 子项能触发 ellipsis 的前提。 */
.ex-row p {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pill {
  display: inline-block;
  padding: 3px 10px;
  border: 1px solid var(--accent-line);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent-hover);
  flex-shrink: 0;
}

/* ===== 底部 CTA ===== */
.final {
  padding: 80px 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.final::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 900px;
  height: 420px;
  transform: translate(-50%, -50%);
  /* 从 12% 提到 20% 并略放大扩散，让 CTA 辉光与下方页脚绿色底连成一片 */
  background: radial-gradient(closest-side, var(--accent-wash-2), transparent 72%);
  pointer-events: none;
}
.final h2 {
  font-family: var(--font-kai);
  font-size: clamp(28px, 5vw, 46px);
  font-weight: 400;
  letter-spacing: 0.02em;
  line-height: 1.24;
  margin-bottom: 12px;
  position: relative;
  color: var(--ink);
}
.final p {
  color: var(--body-muted);
  margin-bottom: 28px;
  position: relative;
}
.final .btn {
  position: relative;
}

/* 与顶部胶囊导航共用 --glass-panel：形成「玻璃上盖 + 玻璃底座」的呼应。
   深浅色模式由令牌自动承接，不再需要硬编码覆盖。 */
.lp-foot {
  position: relative;
  border-top: 1px solid var(--hairline);
  padding: 32px;
  background: var(--glass-panel);
  backdrop-filter: blur(30px) saturate(165%);
  -webkit-backdrop-filter: blur(30px) saturate(165%);
  /* 与卡片同款柔光内晕：顶边清晰 + 向下柔和衰减的亮雾 */
  box-shadow: inset 0 1px 0 var(--sheen), inset 0 14px 28px -22px var(--sheen);
}
.lp-foot-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--body-muted);
}

@media (max-width: 1000px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
    padding: 48px 24px 40px;
  }
  .hero-left {
    padding-top: 0;
  }
  /* 水印跟着缩：窄屏可视宽度本来就小，原尺寸的左水印会整块盖到标题上,
     从「背景纹理」变成「干扰阅读的脏东西」。
     右侧按同比例收（470 → 300），否则窄屏下右水印反而比桌面端还显眼。 */
  .lp-wm-left {
    width: 340px;
    height: 340px;
    left: -120px;
    top: 4%;
  }
  .lp-wm-right {
    width: 140px;
    height: 140px;
    right: 24px;
    top: 9%;
  }
  .lp-wm-big {
    width: 440px;
    height: 440px;
    right: 24px;
    bottom: 24px;
  }
  .lp-head {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .hero-right {
    height: 520px;
  }
  /* 单列布局下 hero 上下内边距变小、.hero-right 也更矮（520px），
     band 随之变矮 → 波峰顶边相对舞台升高。锚点必须同步下收，
     否则构图既会顶到提示行、下沿也会压进波浪区。 */
  .arc-stage {
    --arc-fan-bottom: 248px;
  }
  /* 这里原来有一条 .arc-card 尺寸覆盖，已删除：卡片尺寸统一交给
     --arc-scale 等比缩放，逐项改宽高会与 translate3d 里的几何脱节。 */
}

/* 手机竖屏：再收一档。
   这一档主要是给「单列堆叠」用的 —— 内容本来就高，band 由内容撑开，
   水印再大就只剩花，看不清是品牌。 */
@media (max-width: 640px) {
  .lp-wm-left {
    width: 240px;
    height: 240px;
    left: -90px;
  }
  .lp-wm-right {
    width: 110px;
    height: 110px;
    right: 16px;
    top: 8%;
  }
  .lp-wm-big {
    width: 300px;
    height: 300px;
    right: 16px;
    bottom: 16px;
  }
}
</style>
