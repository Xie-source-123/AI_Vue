<template>
  <div class="admin-shell" :class="{ 'panel-collapsed': !panelOpen }">
    <!-- 整屏右下角的巨大 LOGO 水印。
         刻意作为外壳的【第一个子元素】：配合样式里的 z-index: -1，
         它只会落在「外壳底色之上、内容之下」，主区的卡片会隔着玻璃把它揉开 -->
    <span class="wm wm-big" aria-hidden="true" />
    <!-- ===== 第一栏：图标条（对应工作台的 .rail）=====
         放三个分组，点它跳到该分组的第一个模块 —— 与工作台
         「点图标跳到该工作台的默认条目」是同一个行为。 -->
    <aside class="a-rail">
      <span class="wm wm-rail" aria-hidden="true" />
      <router-link
        class="a-brand"
        to="/admin/overview"
        data-tip="节点 NODE · 管理后台"
        data-tip-pos="right"
        aria-label="管理后台首页"
      >
        <span class="a-brand-mark" aria-hidden="true" />
      </router-link>

      <nav ref="railEl" class="a-rail-stack">
        <span class="a-pill" :class="{ ready: pillReady }" :style="railPillStyle" aria-hidden="true" />
        <router-link
          v-for="g in GROUPS"
          :key="g.key"
          :to="g.items[0].path"
          class="a-rail-btn"
          :class="{ active: activeGroup.key === g.key }"
          :data-tip="g.title"
          data-tip-pos="right"
          :aria-label="g.title"
        >
          <el-icon :size="22"><component :is="g.icon" /></el-icon>
        </router-link>
      </nav>

      <div class="a-rail-foot">
        <button
          class="a-rail-btn"
          :data-tip="panelOpen ? '收起列表' : '展开列表'"
          data-tip-pos="right"
          :aria-label="panelOpen ? '收起列表' : '展开列表'"
          :aria-expanded="panelOpen"
          @click="togglePanel"
        >
          <el-icon :size="19"><component :is="panelOpen ? Fold : Expand" /></el-icon>
        </button>
        <button
          class="a-rail-btn"
          data-tip="退出后台"
          data-tip-pos="right"
          aria-label="退出后台"
          @click="confirmLogout"
        >
          <el-icon :size="19"><SwitchButton /></el-icon>
        </button>
        <span class="a-avatar" :data-tip="`${adminName} · 管理员`" data-tip-pos="right">
          {{ initial }}
        </span>
      </div>
    </aside>

    <!-- ===== 第二栏：内容显示栏（对应工作台的 .panel）=====
         收起时不是 display: none —— 那样会让网格列宽瞬间塌陷；
         走 0px 列宽 + opacity 0 + pointer-events none，
         面板能平滑淡出，收起过程中也不会误点到里面的条目。 -->
    <aside class="a-panel">
      <span class="wm wm-panel" aria-hidden="true" />
      <header class="a-panel-head">
        <span class="tech-eyebrow">{{ activeGroup.label }}</span>
        <h2 class="a-panel-title">{{ activeGroup.title }}</h2>
      </header>

      <div ref="panelBodyEl" class="a-panel-body">
        <span
          class="a-pill a-panel-pill"
          :class="{ ready: pillReady }"
          :style="panelPillStyle"
          aria-hidden="true"
        />
        <div class="a-panel-group">
          <div class="a-panel-group-head">
            <span class="tech-eyebrow a-panel-group-label">模块</span>
            <span class="a-panel-group-count">{{ activeGroup.items.length }}</span>
          </div>
          <router-link
            v-for="(m, i) in activeGroup.items"
            :key="m.route"
            :to="m.path"
            class="a-panel-item"
            :class="{ active: route.name === m.route }"
            :style="{ animationDelay: i * 30 + 'ms' }"
          >
            <span class="a-panel-item-label">{{ m.label }}</span>
            <span class="a-panel-item-sub">{{ m.sub }}</span>
          </router-link>
        </div>
      </div>

      <footer class="a-panel-foot">
        <button class="a-panel-cta press-md focus-ring" @click="refreshPage">
          <el-icon :size="15"><Refresh /></el-icon>
          <span>刷新数据</span>
        </button>
      </footer>
    </aside>

    <!-- ===== 顶栏 ===== -->
    <header class="a-top">
      <div class="a-top-text">
        <span class="tech-eyebrow">{{ current.label }}</span>
        <h1 class="a-title">{{ current.title }}</h1>
      </div>
      <div class="a-top-right">
        <span class="a-date">{{ today }}</span>
        <button
          class="a-icon-btn press-sm focus-ring"
          :title="isDark ? '切换到浅色' : '切换到深色'"
          :aria-label="isDark ? '切换到浅色' : '切换到深色'"
          @click="toggleTheme"
        >
          <el-icon :size="17"><component :is="isDark ? Sunny : Moon" /></el-icon>
        </button>
      </div>
    </header>

    <!-- ===== 公告跑马灯 ===== -->
    <div v-if="announcements.length" class="a-ticker">
      <span class="a-ticker-tag">公告</span>
      <div ref="tickerViewEl" class="a-ticker-view">
        <div class="a-ticker-track" :style="{ animationDuration: tickerDuration }">
          <!-- 两份完全相同的内容：一份滚完另一份正好接上，
               配合 translateX(-50%) 形成无缝循环。
               注意 tickerItems 是【重复过若干遍】的公告 —— 必须重复到
               半份内容宽于容器，否则滚到后半段右侧会露白。 -->
          <div v-for="half in 2" :key="half" class="a-ticker-half">
            <span v-for="(t, i) in tickerItems" :key="i" class="a-ticker-item">{{ t }}</span>
          </div>
        </div>
      </div>
      <button class="a-ticker-edit press-sm focus-ring" title="编辑公告" @click="openTickerEdit">
        <el-icon :size="14"><EditPen /></el-icon>
        <span>编辑</span>
      </button>
    </div>

    <!-- ===== 内容区 =====
         :key 绑 pageKey —— 「刷新数据」就靠递增它把子页面整体重建，
         子页面在 onMounted 里取数，重建即重新取数。
         这样五个页面一个都不用改，也不用各自对外暴露一个 reload 方法。 -->
    <main class="a-body">
      <router-view :key="pageKey" />
    </main>

    <!-- ===== 公告编辑 ===== -->
    <el-dialog v-model="tickerEditVisible" title="编辑公告" width="540px" append-to-body>
      <p class="d-tip">一行一条，空行会被忽略。保存到后端，<b>对所有管理员生效</b>。</p>
      <el-input
        v-model="tickerDraft"
        type="textarea"
        :rows="8"
        placeholder="一行一条公告，例如：&#10;系统将于本周六 22:00 例行维护&#10;新增「算法工程师」岗位题库"
      />
      <template #footer>
        <el-button @click="tickerEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="tickerSaving" @click="saveTicker">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Odometer,
  Collection,
  Monitor,
  Refresh,
  Fold,
  Expand,
  SwitchButton,
  Sunny,
  Moon,
  EditPen
} from '@element-plus/icons-vue'
import { useTheme } from '@/theme/useTheme.js'
import { getAdminName, clearAdminSession } from '@/utils/adminSession.js'
import {
  adminLogoutAPI,
  fetchAnnouncementsAPI,
  saveAnnouncementsAPI,
  adminErrorText
} from '@/api/admin.js'
/* 后台共用样式（令牌作用域 / 卡片 / KPI / 工具栏 / 图表容器）。
   后台是懒加载路由，所以这份样式只在真正进了后台之后才被加载。 */
import '@/assets/admin.css'

const route = useRoute()
const router = useRouter()
const { isDark, toggle: toggleTheme } = useTheme()

/* 两级导航：图标条放分组，面板放分组下的模块 —— 与工作台
   「图标条=工作台切换、面板=该工作台内的条目」一一对应。
   sub 是面板条目的第二行说明，工作台的条目也是这个结构。 */
const GROUPS = [
  {
    key: 'overview',
    label: '概览',
    title: '平台概览',
    icon: Odometer,
    items: [
      {
        route: 'AdminOverview',
        path: '/admin/overview',
        label: '数据总览',
        sub: '账号、面试、岗位的全平台指标'
      }
    ]
  },
  {
    key: 'content',
    label: '内容',
    title: '内容管理',
    icon: Collection,
    items: [
      {
        route: 'AdminPositions',
        path: '/admin/positions',
        label: '岗位管理',
        sub: '面试可选岗位的增删改'
      },
      {
        route: 'AdminBanks',
        path: '/admin/questions',
        label: '题库管理',
        sub: 'Excel 上传与逐题维护'
      }
    ]
  },
  {
    key: 'system',
    label: '系统',
    title: '系统管理',
    icon: Monitor,
    items: [
      {
        route: 'AdminUsers',
        path: '/admin/users',
        label: '用户管理',
        sub: '账号、密码与启用状态'
      },
      {
        route: 'AdminSystem',
        path: '/admin/system',
        label: '系统状态',
        sub: '模型、密钥与存储自检'
      }
    ]
  }
]

const ALL_MODULES = GROUPS.flatMap((g) => g.items)
const current = computed(() => ALL_MODULES.find((m) => m.route === route.name) || ALL_MODULES[0])

/* 当前分组从路由推导，不单独维护一份状态 ——
   两处各存一份的话，直接输 URL 进来时图标条的高亮会和面板对不上。 */
const activeGroup = computed(
  () => GROUPS.find((g) => g.items.some((m) => m.route === route.name)) || GROUPS[0]
)

const adminName = ref(getAdminName() || '管理员')
const initial = computed(() => (adminName.value || 'A').charAt(0).toUpperCase())
const today = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short'
})

/* ===== 面板收起 ===== */
const STORE_PANEL = 'admin_panel_open'
const panelOpen = ref(true)

function togglePanel() {
  panelOpen.value = !panelOpen.value
  try {
    localStorage.setItem(STORE_PANEL, panelOpen.value ? '1' : '0')
  } catch {
    /* 隐私模式下写不进去，本次会话仍有效 */
  }
}

/* ===== 刷新数据 =====
   递增这个 key 会让 <router-view> 重建当前子页面，
   子页面在 onMounted 里取数，重建即重新取数。
   好处：五个页面一个都不用改，也不必各自 defineExpose 一个 reload。 */
const pageKey = ref(0)
function refreshPage() {
  pageKey.value += 1
  ElMessage.success('已重新加载当前页数据')
}

/* ===== 两个滑动药丸（图标条 + 面板）=====
   与工作台同一套：量出当前选中项相对容器的偏移，让药丸 transform 过去，
   而不是给按钮加底色。切换时是「一个东西滑过去」，
   而不是「一块亮起来另一块灭掉」。

   用 offsetTop/offsetLeft 而非 getBoundingClientRect：
   前者基于布局，不受 transform 影响，入场动画不会把药丸算偏。 */
const railEl = ref(null)
const panelBodyEl = ref(null)
const pillReady = ref(false)
const railPill = ref({ x: 0, y: 0, w: 0, h: 0, visible: false })
const panelPill = ref({ x: 0, y: 0, w: 0, h: 0, visible: false })
let pillFrame = 0

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
  const rail = measure(railEl.value, '.a-rail-btn.active')
  if (rail) railPill.value = rail

  /* 面板收起时量出来是 0×0，此时把药丸藏掉而不是留在旧位置 */
  const panel = panelOpen.value ? measure(panelBodyEl.value, '.a-panel-item.active') : null
  panelPill.value = panel || { ...panelPill.value, visible: false }

  /* 首帧先定位再启用过渡，否则药丸会从左上角滑进来 */
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

/* 路由、分组、面板开合都会改变选中项的尺寸或位置，四个条件全都要监听 */
watch([() => route.name, activeGroup, panelOpen], updatePills, { flush: 'post' })

/* 但【只靠 watch 是不够的】——这里踩过一次坑，写下来：
   收起/展开时网格列宽有 0.3s 的过渡，而 updatePills 里的 nextTick 只等到
   DOM 更新后的第一帧。于是展开的那一瞬间，面板还只有几像素宽，
   measure() 读到的宽度接近 0、判定为「量不到」，气丸直接被置为隐藏；
   而之后没有第二次测量，它就永远停在错误的位置（或干脆不出现）——
   表现就是「流光框没有围住它本该围住的那块文字」。

   ResizeObserver 会在面板宽度变化的【每一帧】以及过渡结束后都触发，
   气丸因此能跟上并把最终尺寸量准。
   不会死循环：气丸是 position: absolute，改它不影响面板自身的尺寸。 */
let pillsRO = null

/* ===== 公告跑马灯 ===== */
const announcements = ref([])
const tickerViewEl = ref(null)
const tickerEditVisible = ref(false)
const tickerDraft = ref('')
const tickerSaving = ref(false)

/* 每半份里重复几遍公告。
   为什么必须重复：循环靠 translateX(-50%)，而 -50% 恰好是【半份内容】的宽度。
   一旦半份内容比容器窄，滚到后半段时右侧就会露出一片空白 ——
   表现就是「跑马灯滚着滚着没字了」。
   收起侧边栏会让主区变宽 300px，正是最容易撞上这个的时机；
   在更宽的显示器上，不收起也会撞上。 */
const tickerRepeat = ref(1)

const tickerItems = computed(() => {
  const base = announcements.value
  if (!base.length) return []
  return Array.from({ length: tickerRepeat.value }, () => base).flat()
})

let tickerRO = null

function ensureTickerRepeat() {
  const view = tickerViewEl.value
  const half = view?.querySelector('.a-ticker-half')
  if (!view || !half) return
  /* offsetWidth 而非 getBoundingClientRect：前者基于布局，
     轨道上的 translateX 不会把它算进去。 */
  const unit = half.offsetWidth / tickerRepeat.value
  if (!(unit > 0)) return
  /* 多留一份：让半份严格宽于容器，避免「刚刚好相等」时接缝处仍露白 */
  const need = Math.max(1, Math.ceil(view.clientWidth / unit) + 1)
  if (need !== tickerRepeat.value) tickerRepeat.value = need
}

/* 时长跟着总字数走，而总字数含重复份数 ——
   这样重复多少遍，「每秒滚过多少字」都保持不变，观感一致。 */
const tickerDuration = computed(() => {
  const chars = announcements.value.join('').length * tickerRepeat.value
  return `${Math.max(12, chars * 0.35).toFixed(1)}s`
})

async function loadAnnouncements() {
  try {
    const { data } = await fetchAnnouncementsAPI()
    announcements.value = data.announcements || []
    /* 等 DOM 把公告渲染出来再量宽度 */
    await nextTick()
    ensureTickerRepeat()
  } catch {
    /* 拿不到公告就不显示这条跑马灯，不打断主流程 */
  }
}

function openTickerEdit() {
  tickerDraft.value = announcements.value.join('\n')
  tickerEditVisible.value = true
}

async function saveTicker() {
  const list = tickerDraft.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  tickerSaving.value = true
  try {
    const { data } = await saveAnnouncementsAPI(list)
    announcements.value = data.announcements || []
    tickerEditVisible.value = false
    ElMessage.success(data.message || '已保存')
  } catch (e) {
    ElMessage.error(adminErrorText(e, '保存公告失败'))
  } finally {
    tickerSaving.value = false
  }
}

/* ===== 退出 ===== */
async function confirmLogout() {
  try {
    await ElMessageBox.confirm('退出后需要重新在登录弹窗里三击「登录」才能回到后台。', '退出管理后台', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await adminLogoutAPI()
  } catch {
    /* 令牌可能早就过期了，本地态照样要清 */
  }
  clearAdminSession()
  ElMessage.success('已退出管理后台')
  router.push('/')
}

onMounted(() => {
  /* 把后台的标记挂到 <html> 上。
     令牌定义在 base.css 的 html[data-ws='admin'] 里，而不是挂在这个组件上 ——
     因为弹窗（ElMessage / ElMessageBox / ElDialog）是 teleport 到 <body> 的，
     挂在组件上它们就够不到，后台里弹出的提示会退回 :root 的草木青、与卡片对不上色。

     这里【覆写】而不是删除：从面试/数据工作台跳进来时 <html> 上还留着它们的
     data-ws（直接输 URL 进来也带着上一次的值），删掉会退回默认绿，
     覆写成 'admin' 则两种情况都落到同一组令牌。
     摘标记的活儿由下面 onBeforeUnmount 负责收尾。 */
  document.documentElement.dataset.ws = 'admin'

  try {
    panelOpen.value = localStorage.getItem(STORE_PANEL) !== '0'
  } catch {
    /* 忽略 */
  }
  updatePills()
  loadAnnouncements()

  /* 面板宽度一变就重测气丸。
     收起/展开走的是网格列宽过渡（0.3s），watch 只在起点量一次、量不准，
     这个观察器负责把过渡中与过渡后的尺寸补上。 */
  if (typeof ResizeObserver !== 'undefined') {
    pillsRO = new ResizeObserver(() => updatePills())
    if (panelBodyEl.value) pillsRO.observe(panelBodyEl.value)
    /* 图标条本身不随收起变化，但它也可能因窗口尺寸而改变，
       一起观察，省得将来改了别处又漏掉 */
    if (railEl.value) pillsRO.observe(railEl.value)
  }

  /* 字体加载完再量一次。
     网页字体到得比首屏晚，字一换，条目的高度就可能变几个像素；
     而面板主体是 flex: 1、高度由父级决定，条目变高它自己尺寸不变 ——
     上面的观察器不会触发，气丸就会停在旧高度上。 */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => updatePills()).catch(() => {})
  }

  /* 容器宽度变化时重新量重复份数。
     收起/展开侧边栏会改动主区宽度，这正是轨道相对容器「由宽变窄」
     从而露白的时刻 —— 不重新量的话，收起一次就再也不对了。
     ResizeObserver 不会因为内容变多而触发（.a-ticker-view 是 overflow: hidden
     的定宽容器），所以不会和 ensureTickerRepeat 形成循环。 */
  if (typeof ResizeObserver !== 'undefined') {
    tickerRO = new ResizeObserver(() => ensureTickerRepeat())
    if (tickerViewEl.value) tickerRO.observe(tickerViewEl.value)
  }
})

onBeforeUnmount(() => {
  /* 离开后台必须把 <html> 上的标记摘掉。
     上面 onMounted 只负责覆写、不负责还原 —— 少了这一段，
     退出登录 router.push('/') 之后 data-ws='admin' 会一直留在 <html> 上。
     首页（WelcomeView）自己没有 data-ws，于是整套继承后台那组冷青令牌
     （--accent / --accent-wash / --card-grad / --el-color-primary*），
     表现就是「退出后台后首页颜色变了」。
     WorkspaceLayout 里早就有同款清理，这里当初漏了。 */
  if (typeof document !== 'undefined') delete document.documentElement.dataset.ws
  cancelAnimationFrame(pillFrame)
  if (pillsRO) {
    pillsRO.disconnect()
    pillsRO = null
  }
  if (tickerRO) {
    tickerRO.disconnect()
    tickerRO = null
  }
})
</script>

<style scoped>
/* 外壳沿用工作台的语言：整屏网格 + 浮起的圆角玻璃面板 + 同款底衬渐变。
   三列：图标条 / 内容显示栏 / 主区；前三行是顶栏、跑马灯、内容。
   前两栏跨满三行。 */
.admin-shell {
  /* 水印是绝对定位的，外壳得先成为定位祖先。
     isolation 建独立层叠上下文 —— 没有它，水印的 z-index: -1 会一路退到
     整个文档的最底层（被 body 背景盖掉）；有了它只退到本外壳之内，
     即「外壳底色之上、三栏之下」。 */
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 64px var(--list-w, 300px) minmax(0, 1fr);
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  height: 100vh;
  overflow: hidden;
  background-color: transparent;
  background-image: radial-gradient(1100px 640px at 6% -6%, var(--shell-glow), transparent 68%),
    radial-gradient(900px 560px at 102% 104%, var(--shell-glow), transparent 66%),
    linear-gradient(135deg, var(--accent-wash-2), transparent 62%);
  transition: grid-template-columns 0.3s var(--ease-out);
}
/* 收起：第二列变 0px。不用 display:none —— 那样列宽会瞬间塌陷，
   没有过渡可言；而且要保留面板自身的淡出。 */
.admin-shell.panel-collapsed {
  grid-template-columns: 64px 0px minmax(0, 1fr);
}

/* ===== 第一栏：图标条 ===== */
.a-rail {
  position: relative;
  /* 抬到内容显示栏之上 —— 这一行不能省。
     气泡是 data-tip + ::after 自绘的，它向右伸出图标条、压进面板区域；
     而 .a-rail-btn 与 .a-panel-item 都是 position: relative + z-index: 1，
     层级相同，此时【DOM 靠后的赢】。.a-panel 排在 .a-rail 后面，
     于是气泡会被面板条目盖住 —— 表现为「悬停看不到文字」。
     把整条图标条提到 z-index: 5 就解决了；工作台的 .rail 也是这么做的。 */
  z-index: 5;
  grid-column: 1;
  grid-row: 1 / span 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
  padding: 16px 0;
  gap: 16px;
  border-radius: var(--rad-rail);
  border: 1px solid var(--hairline);
  background: var(--glass-rail);
  backdrop-filter: blur(32px) saturate(170%);
  -webkit-backdrop-filter: blur(32px) saturate(170%);
  box-shadow: inset 0 1px 0 var(--sheen), inset 0 14px 28px -22px var(--sheen);
}

/* 品牌块：46px 圆形，与工作台的 .rail-brand 同尺寸。
   图形与着陆页、工作台图标条同一张遮罩 —— 三处必须同一个形状。 */
.a-brand {
  display: block;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--accent);
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
.a-brand:hover {
  transform: translateY(-1px);
}
.a-brand:active {
  transform: translateY(1px) scale(0.94);
  transition-duration: var(--dur-fast);
}
.a-brand:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* 图标组就是药丸的定位基准 */
.a-rail-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: none;
}

.a-rail-btn {
  position: relative;
  z-index: 1;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--rad-block);
  background: transparent;
  color: var(--body-muted);
  text-decoration: none;
  cursor: pointer;
  transition: var(--slide-trans);
}
.a-rail-btn:hover {
  color: var(--ink);
}
/* 底色交给药丸承载，这里只留图标着色 ——
   否则药丸滑走后旧按钮会残留一块高亮 */
.a-rail-btn.active {
  background: transparent;
  color: var(--accent-hover);
}
.a-rail-btn:active {
  transform: translateY(1px) scale(0.94);
  transition-duration: var(--dur-fast);
}
.a-rail-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.a-rail-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.a-avatar {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--grad-accent);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 700;
}

/* ===== 第二栏：内容显示栏 ===== */
.a-panel {
  /* 面板内水印的定位祖先。层叠上下文由下面的 backdrop-filter 给出 */
  position: relative;
  grid-column: 2;
  grid-row: 1 / span 3;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid var(--hairline);
  background: var(--glass-panel);
  backdrop-filter: blur(32px) saturate(170%);
  -webkit-backdrop-filter: blur(32px) saturate(170%);
  box-shadow: inset 0 1px 0 var(--sheen), inset 0 14px 28px -22px var(--sheen);
  transition: opacity 0.22s var(--ease-out), border-color 0.22s var(--ease-out);
}
.admin-shell.panel-collapsed .a-panel {
  opacity: 0;
  pointer-events: none;
  border-color: transparent;
}

.a-panel-head {
  padding: 22px 18px 18px;
  border-bottom: 1px solid var(--hairline);
}
.a-panel-title {
  margin-top: 5px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.a-panel-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 12px;
}
.a-panel-group {
  margin-bottom: 22px;
}
.a-panel-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 12px;
}
/* 分组标签右侧延伸一条发丝线，把横向空白用起来 */
.a-panel-group-head::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--hairline);
}
.a-panel-group-label {
  flex-shrink: 0;
}
.a-panel-group-count {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: var(--rad-pill);
  background: var(--accent-wash);
  color: var(--accent-hover);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.4;
}

.a-panel-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 13px 14px;
  text-align: left;
  text-decoration: none;
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
.a-panel-item-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--body);
  transition: var(--slide-trans);
}
.a-panel-item-sub {
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--body-muted);
  transition: var(--slide-trans);
}
.a-panel-item + .a-panel-item {
  margin-top: 2px;
}
.a-panel-item:hover {
  transform: translateX(2px);
}
.a-panel-item:hover .a-panel-item-label {
  color: var(--ink);
}
.a-panel-item:active {
  transform: translateY(1px) scale(0.99);
}
.a-panel-item.active .a-panel-item-label {
  color: var(--accent-hover);
  font-weight: 600;
}
.a-panel-item.active .a-panel-item-sub {
  color: var(--body);
}
.a-panel-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.a-panel-foot {
  padding: 14px 18px 18px;
  border-top: 1px solid var(--hairline);
}
.a-panel-cta {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 0;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent-line);
  background: var(--accent-wash);
  color: var(--accent-hover);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}
.a-panel-cta:hover {
  background: var(--accent-wash-2);
  border-color: var(--accent);
}
.a-panel-cta:active {
  transform: translateY(1px) scale(0.98);
  transition-duration: var(--dur-fast);
}

/* ===== 选中滑块（图标条与面板共用，与工作台同一套）===== */
.a-pill {
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
/* 首帧定位完成后才挂 .ready，否则药丸会从左上角滑进来 */
.a-pill.ready {
  transition: transform var(--dur-slow) var(--ease-out),
    width var(--dur-slow) var(--ease-out), height var(--dur-slow) var(--ease-out),
    opacity var(--dur-base) var(--ease-out);
}

/* ===== 选中项外圈的流光 =====
   锥形渐变 + 遮罩挖空成 2px 边框。
   矩形不能靠「旋转元素」跑光（一转形状就歪），必须动渐变角度，
   所以要用 @property 把 --ang 声明成 <angle>，animation 才能插值。 */
@property --ang {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.a-pill::before {
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
  animation: a-pill-run 3.2s linear infinite;
}
/* 面板条目更宽更矮，整圈跑光会显得很急，单独降一档亮度 */
.a-panel-pill::before {
  opacity: 0.8;
}
@keyframes a-pill-run {
  to {
    --ang: 360deg;
  }
}
@media (prefers-reduced-motion: reduce) {
  .a-pill::before {
    animation: none;
  }
}

/* ===== 顶栏 ===== */
.a-top {
  grid-column: 3;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 20px;
  border-radius: var(--rad-rail);
  border: 1px solid var(--hairline);
  background: var(--card-grad);
  backdrop-filter: blur(26px) saturate(170%);
  -webkit-backdrop-filter: blur(26px) saturate(170%);
  box-shadow: var(--shadow-md), inset 0 1px 0 var(--sheen);
}
.a-top-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.a-title {
  font-size: 17px;
  font-weight: 650;
  color: var(--ink);
  letter-spacing: -0.01em;
}
.a-top-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.a-date {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--body-muted);
  white-space: nowrap;
}
.a-icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: transparent;
  color: var(--body);
  cursor: pointer;
  transition: var(--slide-trans);
}
.a-icon-btn:hover {
  border-color: var(--accent-line);
  color: var(--accent-hover);
  background: var(--accent-wash);
}

/* ===== 公告跑马灯 ===== */
.a-ticker {
  grid-column: 3;
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 16px;
  border-radius: var(--rad-rail);
  border: 1px solid var(--accent-line);
  background: var(--accent-wash);
  overflow: hidden;
}
.a-ticker-tag {
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: var(--rad-pill);
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.a-ticker-view {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  /* 两侧淡出：文字从右边"长出来"、在左边"化掉"，
     比硬生生从边框里切出去自然 */
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 36px, #000 calc(100% - 36px), transparent);
  mask-image: linear-gradient(90deg, transparent, #000 36px, #000 calc(100% - 36px), transparent);
}
.a-ticker-track {
  display: flex;
  width: max-content;
  animation-name: a-ticker-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.a-ticker:hover .a-ticker-track {
  animation-play-state: paused;
}
/* 每一半自己带上尾部间距，两半宽度才完全相等 ——
   这样 translateX(-50%) 正好等于一整份内容，循环接缝处不会跳一下。 */
.a-ticker-half {
  display: flex;
  gap: 56px;
  padding-right: 56px;
}
.a-ticker-item {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--body);
  white-space: nowrap;
}
@keyframes a-ticker-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
.a-ticker-edit {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent-line);
  background: transparent;
  color: var(--accent-hover);
  font-size: 12px;
  cursor: pointer;
  transition: var(--slide-trans);
}
.a-ticker-edit:hover {
  background: var(--accent-wash-2);
}
/* 关掉动效偏好时跑马灯静止（内容仍可读、仍可编辑） */
@media (prefers-reduced-motion: reduce) {
  .a-ticker-track {
    animation: none;
  }
}

/* ===== 内容区 ===== */
.a-body {
  grid-column: 3;
  grid-row: 3;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}
.a-body::-webkit-scrollbar {
  width: 8px;
}
.a-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--hairline-strong);
}

.d-tip {
  margin-bottom: 14px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--body-muted);
}
.d-tip b {
  color: var(--ink);
}

/* ===== LOGO 水印 =====
   与工作台 WorkspaceLayout、着陆页 WelcomeView 是同一套做法：
   用 mask 给 logo-mark.png 上色（而不是插 <img> —— 那是黑墨位图，
   深色模式下会变成一团看不见的黑），颜色取 var(--accent)，
   所以后台这套冷青令牌一换，水印跟着换。

   z-index: -1 是关键，不是随手写的：
   若用 0，按 CSS 绘制顺序它会盖住【未定位】的 .a-panel / .a-body 的背景
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
   出血时只能看到圆形的左上四分之一，用户看到的就是「只看到一点」。
   现在 640px + 留 32px 边距，整个标志完整可见。
   尺寸从 900 收到 640 是配套的：640 + 32 边距 = 672，在 900px 高的屏上不顶到上边。
   数值与工作台 .wm-big、首页 .lp-wm-big 完全一致 —— 三处必须是同一个水印。
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

/* 内容显示栏：面板是 overflow: hidden 的玻璃，出血部分会被裁在 24px 圆角内。
   比大块浓一档（0.20）—— 面积小，同样浓淡会显得更淡。
   放在【中上部】而不是贴底：面板收起时整块会跟着淡出（列宽 0 + opacity 0），
   用 top 定位就不依赖底部那条边，视觉上更稳。 */
.wm-panel {
  width: 220px;
  height: 220px;
  left: -60px;
  top: 34%;
  transform: rotate(-10deg);
  opacity: 0.2;
}

/* 图标条只有 64px，放不下出血构图，所以做成一枚完整的小水印。
   同样不再贴底，改到图标条【正中间】——translateY(-50%) 把水印自身的
   高度抵消掉，这样 top: 50% 才是「圆心对中线」而不是「上边缘对中线」。 */
.wm-rail {
  width: 52px;
  height: 52px;
  left: 6px;
  top: 50%;
  transform: translateY(-50%) rotate(-6deg);
  opacity: 0.2;
}

@media (max-width: 1100px) {
  /* 窄屏可视宽度本来就小，900px 会整块压在内容上 */
  .wm-big {
    width: 440px;
    height: 440px;
    right: 24px;
    bottom: 24px;
  }
}
</style>
