<template>
  <div class="shell" :class="{ 'panel-collapsed': !panelOpen }">
    <!-- 整屏右下角的巨大 LOGO 水印。
         刻意作为外壳的【第一个子元素】：配合样式里的 z-index: -1，
         它只会落在「外壳底色之上、内容之下」，主区的卡片会隔着玻璃把它揉开 -->
    <span class="wm wm-big" aria-hidden="true" />
    <!-- ===== 第一栏：图标条 ===== -->
    <nav class="rail">
      <span class="wm wm-rail" aria-hidden="true" />
      <button
        class="rail-brand"
        data-tip="返回首页"
        data-tip-pos="right"
        aria-label="返回首页"
        @click="goHome"
      />

      <div ref="railStack" class="rail-stack">
        <span
          class="rail-pill"
          :class="{ ready: pillReady }"
          :style="railPillStyle"
          aria-hidden="true"
        />
        <button
          v-for="w in WORKSPACES"
          :key="w.key"
          class="rail-btn"
          :class="{ active: wsKey === w.key }"
          :data-tip="w.title" data-tip-pos="right"
          :aria-label="w.title"
          @click="goWorkspace(w)"
        >
          <el-icon :size="22"><component :is="w.icon" /></el-icon>
        </button>
      </div>

      <div class="rail-foot">
        <button
          class="rail-btn"
          :data-tip="panelOpen ? '收起列表' : '展开列表'" data-tip-pos="right"
          :aria-label="panelOpen ? '收起列表' : '展开列表'"
          @click="panelOpen = !panelOpen"
        >
          <el-icon :size="19"><component :is="panelOpen ? Fold : Expand" /></el-icon>
        </button>
        <button
          class="rail-btn"
          :data-tip="isDark ? '切换到浅色' : '切换到深色'" data-tip-pos="right"
          :aria-label="isDark ? '切换到浅色' : '切换到深色'"
          @click="toggleTheme"
        >
          <el-icon :size="19"><component :is="isDark ? Sunny : Moon" /></el-icon>
        </button>
        <button
          class="rail-btn"
          data-tip="退出登录" data-tip-pos="right"
          aria-label="退出登录"
          @click="confirmLogout"
        >
          <el-icon :size="19"><SwitchButton /></el-icon>
        </button>
        <button
          class="rail-avatar"
          :data-tip="username" data-tip-pos="right"
          :aria-label="username"
          @click="goWorkspace(WORKSPACE_MAP.me)"
        >
          <img v-if="avatarData" :src="avatarData" alt="" />
          <template v-else>{{ initial }}</template>
        </button>
      </div>
    </nav>

    <!-- ===== 第二栏：列表面板 ===== -->
    <aside class="panel">
      <span class="wm wm-panel" aria-hidden="true" />
      <header class="panel-head">
        <span class="tech-eyebrow">{{ ws.label }}</span>
        <h1 class="panel-title">{{ ws.title }}</h1>
      </header>

      <div class="panel-search">
        <el-input v-model="query" placeholder="搜索…" :prefix-icon="Search" clearable />
      </div>

      <div ref="panelBody" class="panel-body">
        <span
          class="panel-pill"
          :class="{ ready: pillReady }"
          :style="panelPillStyle"
          aria-hidden="true"
        />
        <div v-for="g in visibleGroups" :key="g.label" class="panel-group">
          <div class="panel-group-head">
            <span class="tech-eyebrow panel-group-label">{{ g.label }}</span>
            <span class="panel-group-count">{{ g.items.length }}</span>
          </div>
          <button
            v-for="(item, i) in g.items"
            :key="item.key"
            class="panel-item"
            :class="{ active: activeItem === item.key }"
            :style="{ animationDelay: i * 30 + 'ms' }"
            @click="activeItem = item.key"
          >
            <span class="panel-item-label">{{ item.label }}</span>
            <span class="panel-item-sub">{{ item.sub }}</span>
          </button>
        </div>
        <p v-if="!visibleGroups.length" class="panel-empty">没有匹配的条目</p>
      </div>

      <footer class="panel-foot">
        <button class="panel-cta" @click="primaryAction">
          <el-icon :size="15"><Plus /></el-icon>
          <span>{{ ws.cta }}</span>
        </button>
      </footer>
    </aside>

    <!-- ===== 第三栏：主区 ===== -->
    <main class="main">
      <header class="main-head">
        <div class="main-head-text">
          <h2 class="main-title">{{ currentItem ? currentItem.label : ws.title }}</h2>
          <p class="main-sub">{{ currentItem ? currentItem.sub : '' }}</p>
        </div>
        <div class="main-head-meta">
          <span class="tech-eyebrow">{{ username }}</span>
          <span class="main-dot" />
          <span class="tech-eyebrow">{{ today }}</span>
        </div>
      </header>

      <div class="main-body workspace-main">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Sunny, Moon, Plus, Fold, Expand, SwitchButton } from '@element-plus/icons-vue'
import { useTheme } from '@/theme/useTheme.js'
import { avatar, reloadAvatar } from '@/utils/avatar.js'
import { logout } from '@/utils/session.js'
/* 品牌图形由 CSS 的 mask 引用（见 .rail-brand），不需要 import */
import {
  WORKSPACES,
  WORKSPACE_MAP,
  activeItem,
  pendingItem,
  query,
  workspaceOf,
  findItem
} from '@/theme/workspace.js'

const route = useRoute()
const router = useRouter()
const { isDark, toggle: toggleTheme } = useTheme()

const username = ref('')
const panelOpen = ref(true)

const wsKey = computed(() => workspaceOf(route.name).key)
const ws = computed(() => WORKSPACE_MAP[wsKey.value])
const currentItem = computed(() => findItem(wsKey.value, activeItem.value))
const initial = computed(() =>
  username.value ? username.value.charAt(0).toUpperCase() : 'U'
)
const today = computed(() => new Date().toISOString().slice(0, 10))

const visibleGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return ws.value.groups
  return ws.value.groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => `${i.label}${i.sub}`.toLowerCase().includes(q))
    }))
    .filter((g) => g.items.length)
})

/* =====================================================================
   选中滑块：测量选中项相对容器的偏移，用 transform 驱动药丸滑行
   ===================================================================== */
const railStack = ref(null)
const panelBody = ref(null)
const pillReady = ref(false)
const railPill = ref({ x: 0, y: 0, w: 0, h: 0, visible: false })
const panelPill = ref({ x: 0, y: 0, w: 0, h: 0, visible: false })

let pillFrame = 0
let pillRO = null

/**
 * 选中项相对容器的偏移。
 * 用 offsetTop/offsetLeft/offsetWidth/offsetHeight 而非 getBoundingClientRect：
 * 前者基于布局，不受 CSS transform 影响，因此入场位移动画不会让药丸算偏；
 * 也不需要补 scrollTop（offsetParent 坐标本身就是内容坐标）。
 */
function measure(root, selector) {
  if (!root) return null
  const el = root.querySelector(selector)
  if (!el) return null
  const w = el.offsetWidth
  const h = el.offsetHeight
  if (!w || !h) return null
  return { x: el.offsetLeft, y: el.offsetTop, w, h, visible: true }
}

async function updatePills() {
  await nextTick()

  const rail = measure(railStack.value, '.rail-btn.active')
  if (rail) railPill.value = rail

  const panel = panelOpen.value ? measure(panelBody.value, '.panel-item.active') : null
  panelPill.value = panel || { ...panelPill.value, visible: false }

  /* 首帧先定位再启用过渡，否则药丸会从顶部滑下来 */
  if (!pillReady.value && (railPill.value.visible || panelPill.value.visible)) {
    cancelAnimationFrame(pillFrame)
    pillFrame = requestAnimationFrame(() => {
      pillReady.value = true
    })
  }
}

const pillStyle = (p) => ({
  transform: `translate(${p.x}px, ${p.y}px)`,
  width: `${p.w}px`,
  height: `${p.h}px`,
  opacity: p.visible ? 1 : 0
})

const railPillStyle = computed(() => pillStyle(railPill.value))
const panelPillStyle = computed(() => pillStyle(panelPill.value))

watch([wsKey, activeItem, visibleGroups, panelOpen], updatePills, { flush: 'post' })

/* =====================================================================
   把当前工作台挂到 <html data-ws="...">
   与 useTheme 的 data-theme 同一层 —— chartTheme.js 是从 documentElement
   读 CSS 变量的，令牌覆盖必须在 html 层，四张图才能跟着变色。
   面试工作台用 :root 默认的草木青，无需额外规则。
   ===================================================================== */
watchEffect(() => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.ws = wsKey.value
})

/* 切换工作台时把选中项重置为该工作台的第一项（尊重显式指定落点） */
watch(
  wsKey,
  (k) => {
    if (pendingItem.value) {
      activeItem.value = pendingItem.value
      pendingItem.value = null
      return
    }
    const first = WORKSPACE_MAP[k]?.groups?.[0]?.items?.[0]
    if (first) activeItem.value = first.key
  },
  { immediate: true }
)

onMounted(() => {
  username.value = localStorage.getItem('username') || '用户'
  reloadAvatar()
  updatePills()

  /* 窗口缩放 / 侧栏折叠 / 搜索过滤都会改变位置，交给 ResizeObserver 兜住 */
  if (typeof ResizeObserver !== 'undefined') {
    pillRO = new ResizeObserver(() => updatePills())
    if (railStack.value) pillRO.observe(railStack.value)
    if (panelBody.value) pillRO.observe(panelBody.value)
  }
})

onBeforeUnmount(() => {
  /* 离开 /app 时清掉工作台标记，否则登录页会继承上一个工作台的配色 */
  if (typeof document !== 'undefined') delete document.documentElement.dataset.ws
  cancelAnimationFrame(pillFrame)
  if (pillRO) {
    pillRO.disconnect()
    pillRO = null
  }
})

/* 头像：三处显示共用 utils/avatar.js 里的响应式 ref，这里只是取个别名，
   避免模板里 avatar 与局部变量重名 */
const avatarData = avatar

const confirmLogout = async () => {
  try {
    await ElMessageBox.confirm('退出后需要重新登录，确定退出吗？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
    logout(router)
  } catch {
    /* 用户取消，什么都不做 */
  }
}

const goWorkspace = (w) => router.push(w.path)
const goHome = () => router.push('/')
const primaryAction = () => ElMessage.info(`${ws.value.cta} · 功能开发中`)
</script>

<style scoped>
/* =====================================================================
   外壳：三栏改为「浮起的圆角玻璃面板」，与主区卡片同一套视觉语言
   ===================================================================== */
.shell {
  /* 水印是绝对定位的，外壳得先成为定位祖先。
     isolation 建独立层叠上下文 —— 没有它，水印的 z-index: -1 会一路退到
     整个文档的最底层（被 body 背景盖掉）；有了它只退到本外壳之内，
     即「外壳底色之上、三栏之下」。 */
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: var(--rail-w) var(--list-w) minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  height: 100vh;
  overflow: hidden;
  background-color: transparent;
  /* 底衬用比玻璃更浓的草木绿：
     玻璃基色与底衬的色差，决定了两块面板 0.85 / 0.6 的透明度差能不能被看见。
     底衬若和玻璃同色，alpha 怎么调混合结果都一样，两块就分不出来。 */
  background-image: radial-gradient(1100px 640px at 6% -6%, var(--shell-glow), transparent 68%),
    radial-gradient(900px 560px at 102% 104%, var(--shell-glow), transparent 66%),
    linear-gradient(135deg, var(--accent-wash-2), transparent 62%);
  transition: grid-template-columns 0.3s var(--ease-out);
}

/* 列表面板收起 */
.shell.panel-collapsed {
  grid-template-columns: var(--rail-w) 0px minmax(0, 1fr);
}
.shell.panel-collapsed .panel {
  opacity: 0;
  pointer-events: none;
  border-color: transparent;
}

/* 玻璃面：图标条与列表栏是同一种材质，只差透明度；顶部一道高光给材质厚度 */
.rail,
.panel {
  backdrop-filter: blur(32px) saturate(170%);
  -webkit-backdrop-filter: blur(32px) saturate(170%);
  border: 1px solid var(--hairline);
  box-shadow: inset 0 1px 0 var(--sheen), inset 0 14px 28px -22px var(--sheen);
  min-height: 0;
}

/* ===== 第一栏：图标条（更透，读出底下的淡底） ===== */
.rail {
  position: relative;
  /* 抬到面板之上，否则自绘提示气泡会被后面的面板盖住 */
  z-index: 5;
  background: var(--glass-rail);
  border-radius: var(--rad-rail);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 16px;
}

/* 品牌块：实心主题色圆 + 镂空线条（与着陆页同一张遮罩）。
   颜色取 var(--accent)，所以会跟着当前工作台的主题色走 —— 这与改造前
   那个 linear-gradient(var(--accent), var(--accent-hover)) 的方块行为一致。 */
.rail-brand {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border: none;
  padding: 0;
  cursor: pointer;
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
  transition: var(--slide-trans);
}

.rail-brand:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.rail-stack {
  position: relative;
  /* 不再撑满：让图标组紧贴品牌下方，空白集中到底部控制组之前 */
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.rail-btn {
  position: relative;
  z-index: 1;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--rad-block);
  color: var(--body-muted);
  cursor: pointer;
  transition: var(--slide-trans);
}

.rail-btn:hover {
  color: var(--ink);
}

/* 底色已交给药丸承载，这里只留图标着色。
   否则药丸滑走后，旧按钮会残留一块高亮 */
.rail-btn.active {
  background: transparent;
  box-shadow: none;
  color: var(--accent-hover);
}

/* ===== 按下反馈：下沉 + 缩小，时长压到 fast ===== */
.rail-btn:active,
.rail-brand:active,
.rail-avatar:active,
.panel-cta:active {
  transform: translateY(1px) scale(0.94);
  transition-duration: var(--dur-fast);
}

/* ===== 选中滑块（图标条与列表栏共用） ===== */
.rail-pill,
.panel-pill {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: var(--rad-block);
  background: var(--accent-wash-2);
  box-shadow: inset 0 0 0 1px var(--accent-line), 0 0 16px var(--glow);
  opacity: 0;
}

/* 首帧定位完成后才挂上 .ready，否则药丸会从顶部滑下来 */
.rail-pill.ready,
.panel-pill.ready {
  transition: transform var(--dur-slow) var(--ease-out),
    width var(--dur-slow) var(--ease-out), height var(--dur-slow) var(--ease-out),
    opacity var(--dur-base) var(--ease-out);
}

/* ===== 选中项外圈的流光 =====
   锥形渐变 + 遮罩挖空成 1.5px 边框。
   矩形不能用「旋转元素」的方式跑光（一转形状就歪），必须动渐变角度，
   所以需要 @property 把 --ang 声明成 <angle> 才能被 animation 插值。 */
@property --ang {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.rail-pill::before,
.panel-pill::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: calc(var(--rad-block) + 2px);
  padding: 2px;
  background: conic-gradient(
    from var(--ang),
    transparent 0deg,
    transparent 200deg,
    var(--accent) 268deg,
    var(--accent-soft) 330deg,
    var(--accent-soft) 352deg,
    transparent 358deg
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  /* 选中即常流 */
  animation: rail-run 3.2s linear infinite;
}

/* 列表项更宽更矮，整圈跑光会显得很急，单独降一档亮度 */
.panel-pill::before {
  opacity: 0.8;
}

@keyframes rail-run {
  to {
    --ang: 360deg;
  }
}

/* ===== 键盘焦点环：outline 不占布局，也不会被 overflow 裁掉 ===== */
.rail-btn:focus-visible,
.rail-brand:focus-visible,
.rail-avatar:focus-visible,
.panel-item:focus-visible,
.panel-cta:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* 提示气泡的样式已提升为全局原语（base.css 的 [data-tip]）。
   图标条在屏幕左缘，所以统一使用右侧方位 data-tip-pos="right"。 */

.rail-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
  width: 42px;
}

.rail-avatar {
  /* ★ padding:0 是必须的：这是 <button>，浏览器默认 padding 1px 6px
     未被全局重置（base.css 只重置了 box-sizing / margin，全量产物中
     也不存在通用的 button padding 归零规则）。不归零时内容盒只有
     26×36，width/height:100% 的 img 会被拉成椭圆并在圆内偏移。 */
  position: relative;
  padding: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--canvas);
  border: none;
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--slide-trans);
}

.rail-avatar:hover {
  box-shadow: 0 0 0 2px var(--accent-soft);
}

/* 上传的头像要裁成圆形填满，否则会溢出圆角 */
.rail-avatar img {
  /* 同 acct-avatar：绝对定位填满，尺寸由父容器决定。 */
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

/* ===== 第二栏：列表面板 ===== */
.panel {
  /* 面板内水印的定位祖先。层叠上下文由上面的 backdrop-filter 给出 */
  position: relative;
  background: var(--glass-panel);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: opacity 0.22s var(--ease-out), border-color 0.22s var(--ease-out);
}

.panel-head {
  padding: 22px 18px 18px;
  border-bottom: 1px solid var(--hairline);
}

.panel-title {
  margin-top: 5px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: var(--track-tight);
  color: var(--ink);
}

.panel-search {
  padding: 14px 12px;
  border-bottom: 1px solid var(--hairline);
}

.panel-search :deep(.el-input__wrapper) {
  background: var(--canvas-2);
  border: 1px solid var(--hairline);
  border-radius: var(--rad-block);
  /* 内阴影做出「凹陷」感，与浮起的面板形成对比 */
  box-shadow: inset 0 1px 2px var(--shadow-inset);
  padding: 3px 10px;
}

.panel-search :deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent);
  box-shadow: inset 0 1px 2px var(--shadow-inset) !important;
}

.panel-search :deep(.el-input__inner) {
  color: var(--ink);
}

.panel-search :deep(.el-input__inner::placeholder) {
  color: var(--body-muted);
}

.panel-body {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 18px 12px;
  min-height: 0;
}

.panel-group {
  margin-bottom: 22px;
}

.panel-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 12px;
}

/* 分组标签右侧延伸一条发丝线，把横向空白用起来 */
.panel-group-head::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--hairline);
}

.panel-group-label {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--body-muted);
}

.panel-group-count {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: var(--rad-pill);
  background: var(--accent-wash);
  color: var(--accent-hover);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.4;
}

.panel-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  /* 内边距加大：把下方的纵向空白转成可点击区 */
  padding: 13px 14px;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--rad-block);
  cursor: pointer;
  transition: var(--slide-trans);
  /* backwards：延迟期先显示位移起点，动画结束后交还给普通样式，
     因此不会覆盖 hover / active 的位移 */
  animation: panel-item-in var(--dur-slow) var(--ease-out) backwards;
}

@keyframes panel-item-in {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.panel-item-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--body);
}

.panel-item-sub {
  font-size: 12px;
  line-height: 1.45;
  color: var(--body-muted);
}

.panel-item + .panel-item {
  margin-top: 6px;
}

.panel-item:hover {
  background: var(--canvas-2);
  border-color: var(--hairline);
  transform: translateX(3px);
}

/* 悬停是右移 3px，按下要压回去 */
.panel-item:active {
  transform: translateX(1px) scale(0.99);
  transition-duration: var(--dur-fast);
}

.panel-item:hover .panel-item-label {
  color: var(--ink);
}

/* 底色已交给药丸；选中不再位移，与悬停明确区分 */
.panel-item.active {
  background: transparent;
  border-color: transparent;
  transform: none;
}

.panel-item.active .panel-item-label {
  color: var(--accent-hover);
}

.panel-item.active .panel-item-sub {
  color: var(--accent-hover);
  opacity: 0.82;
}

.panel-empty {
  padding: 14px 12px;
  font-size: 12px;
  color: var(--body-muted);
}

.panel-foot {
  padding: 16px 12px;
  border-top: 1px solid var(--hairline);
}

.panel-cta {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 13px 14px;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  border-radius: var(--rad-block);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}

.panel-cta:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* ===== 第三栏：主区 ===== */
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: transparent;
}

/* 与列表栏 panel-head 的 18px 内边距对齐 */
.main-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 0;
  flex-shrink: 0;
}

.main-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: var(--track-tight);
  color: var(--ink);
}

.main-sub {
  margin-top: 3px;
  font-size: 13px;
  color: var(--body-muted);
}

.main-head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 4px;
}

.main-head-meta .tech-eyebrow {
  color: var(--body-muted);
}

.main-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}

.main-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

@media (max-width: 1100px) {
  .shell {
    grid-template-columns: var(--rail-w) minmax(0, 1fr);
  }
  .panel {
    display: none;
  }
}

/* ===== LOGO 水印 =====
   为什么用 mask 而不是 <img>：logo-mark.png 是「黑墨 + 透明」的位图，
   直接当图片插进来只能是黑的，深色模式下就成了一团看不见的黑。
   套上 mask 再用 background 上色，图形就跟着 --accent 走 ——
   面试工作台草木绿、数据工作台冷青、个人工作台橄榄绿，与全站同一套令牌。
   着陆页的 .lp-wm 用的是同一套做法，三处统一的是尺寸与浓淡。

   z-index: -1 是关键，不是随手写的：
   若用 0，按 CSS 绘制顺序它会盖住【未定位】的 .panel / .main 的背景
   （定位元素晚于普通流绘制）。用 -1 则它落在「外壳底色之上、三栏之下」，
   三栏的玻璃 backdrop-filter 会把它揉开 —— 隔着玻璃透出来才是水印，
   贴在内容上面就成贴纸了。 */
.wm {
  position: absolute;
  z-index: -1;
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

/* 整屏右下角：完整显示，不再出血。
   改造过程：一开始是 900px 贴左下并出血，后来改到右下、出血从 320 收到 420 ——
   但出血就意味着只能看到圆形的左上那四分之一，用户看到的就是「只看到一点」。
   现在 640px + 留 32px 边距，整个标志完整可见。
   尺寸从 900 收到 640 是配套的：640 + 32 边距 = 672，在 900px 高的屏上不会顶到上边。
   旋转 -8° 不会裁到墨迹：旋转后外接框比盒子大 41px，但标志是内切圆
   （半径约 0.45×640 = 288），圆心距各边 352px，288 < 352，留有余量。 */
.wm-big {
  width: 640px;
  height: 640px;
  right: 32px;
  bottom: 32px;
  transform: rotate(-8deg);
  opacity: 0.18;
}

/* 列表面板：面板是 overflow: hidden 的玻璃，出血部分会被裁在 24px 圆角内。
   比大块浓一档（0.20）—— 面积小，同样浓淡会显得更淡。
   放在【中上部】而不是贴底：贴底时它会和底部那块「刷新数据」按钮挤在一起，
   而且面板一收起（列宽 0）整块就没了，贴底更看不出层次。
   用 top 而不是 bottom 定位，就是「不再固定贴在下面那条边」的意思。 */
.wm-panel {
  width: 220px;
  height: 220px;
  left: -60px;
  top: 34%;
  transform: rotate(-10deg);
  opacity: 0.2;
}

/* 图标条只有 64px，放不下出血构图，所以做成一枚完整的小水印。
   同样不再贴底，改到图标条【正中间】——translateY(-50%) 把水印自身
   的高度抵消掉，这样 top: 50% 才是「圆心对中线」而不是「上边缘对中线」。 */
.wm-rail {
  width: 52px;
  height: 52px;
  left: 6px;
  top: 50%;
  transform: translateY(-50%) rotate(-6deg);
  opacity: 0.2;
}

@media (max-width: 1100px) {
  /* 面板在这一档已经是 display:none，那块水印跟着一起没了；
     只剩大块要收 —— 窄屏可视宽度本来就小，900px 会整块压在内容上 */
  .wm-big {
    width: 440px;
    height: 440px;
    right: 24px;
    bottom: 24px;
  }
}
</style>
