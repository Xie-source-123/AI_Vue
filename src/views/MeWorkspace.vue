<template>
  <div class="split-2-1">
    <!-- ===== 个人资料：ProfileView 直接产出网格项 ===== -->
    <ProfileView v-if="activeItem === 'profile'" />

    <!-- ===== 偏好设置：独立界面 ===== -->
    <template v-else>
      <section class="card span-2 prefs">
        <span class="tech-section">外观</span>
        <div class="seg">
          <button
            v-for="m in modes"
            :key="m.key"
            class="seg-btn press-md focus-ring"
            :class="{ active: mode === m.key }"
            @click="setMode(m.key)"
          >
            {{ m.label }}
          </button>
        </div>
        <p class="prefs-hint">当前跟随设置：{{ modeLabel }}。浅色 / 深色会同时作用于三个工作台。</p>

        <span class="tech-section prefs-gap">数据</span>
        <div class="prefs-row">
          <div>
            <p class="prefs-row-title">本地数据</p>
            <p class="prefs-row-sub">简历与面试记录都保存在浏览器本地。</p>
          </div>
          <button class="danger-btn press-md focus-ring" @click="clearData">清除本地数据</button>
        </div>

        <div class="prefs-row">
          <div>
            <p class="prefs-row-title">演示数据</p>
            <p class="prefs-row-sub">
              载入 13 场带评分的面试记录与 3 份简历，用于预览数据工作台的满状态效果。
            </p>
          </div>
          <div class="prefs-actions">
            <button class="ghost-btn press-md focus-ring" @click="loadDemo">载入</button>
            <button class="ghost-btn press-md focus-ring" @click="wipeDemo">移除</button>
          </div>
        </div>
        <p class="prefs-hint">载入后切到「数据工作台」即可看到图表与表格的完整形态。</p>
      </section>

      <section class="card aside-card">
        <span class="tech-section">账户</span>
        <div class="acct">
          <div class="acct-avatar">
            <img v-if="avatarData" :src="avatarData" alt="" />
            <template v-else>{{ initial }}</template>
          </div>
          <div class="acct-meta">
            <span class="acct-name">{{ username }}</span>
            <span class="acct-role">{{ isGuest ? '访客账号' : '正式账号' }}</span>
          </div>
        </div>

        <span class="tech-section aside-gap">使用情况</span>
        <dl class="stat-list">
          <div class="stat-row">
            <dt>面试记录</dt>
            <dd>{{ counts.records }}</dd>
          </div>
          <div class="stat-row">
            <dt>简历</dt>
            <dd>{{ counts.resumes }}</dd>
          </div>
        </dl>

        <span class="tech-section aside-gap">工作台</span>
        <button v-for="w in WORKSPACES" :key="w.key" class="aside-link press-md focus-ring" @click="go(w.path)">
          <span>{{ w.title }}</span>
          <span class="aside-link-meta">→</span>
        </button>

        <button class="logout-btn press-md focus-ring" @click="confirmLogout">
          <el-icon :size="14"><SwitchButton /></el-icon>
          <span>退出登录</span>
        </button>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ProfileView from '@/views/ProfileView.vue'
import { useTheme } from '@/theme/useTheme.js'
import { activeItem, WORKSPACES } from '@/theme/workspace.js'
import { getUserItem, clearGuestData } from '@/utils/userStorage.js'
import { avatar, reloadAvatar } from '@/utils/avatar.js'
import { logout } from '@/utils/session.js'
import { SwitchButton } from '@element-plus/icons-vue'
import { seedDemoData, clearDemoData } from '@/utils/demoData.js'

const router = useRouter()
const { mode, setMode } = useTheme()

const username = ref('用户')
const isGuest = ref(false)
const counts = ref({ records: 0, resumes: 0 })

const modes = [
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
  { key: 'system', label: '跟随系统' }
]

const modeLabel = computed(() => modes.find((m) => m.key === mode.value)?.label || '跟随系统')
const initial = computed(() =>
  username.value ? username.value.charAt(0).toUpperCase() : 'U'
)

const len = (key) => {
  try {
    return JSON.parse(getUserItem(key) || '[]').length
  } catch {
    return 0
  }
}

const loadCounts = () => {
  counts.value = {
    records: len('interview_records'),
    resumes: len('saved_resumes') + len('uploaded_files')
  }
}

const loadDemo = () => {
  try {
    const n = seedDemoData()
    loadCounts()
    ElMessage.success(`已载入 ${n} 场演示面试记录`)
  } catch {
    ElMessage.error('演示数据载入失败')
  }
}

const wipeDemo = () => {
  try {
    const n = clearDemoData()
    loadCounts()
    ElMessage.success(n ? `已移除 ${n} 条演示数据` : '当前没有演示数据')
  } catch {
    ElMessage.error('演示数据移除失败')
  }
}

const clearData = () => {
  ElMessageBox.confirm(
    '会清除浏览器里保存的简历与面试记录，此操作不可撤销。',
    '清除本地数据',
    { confirmButtonText: '清除', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => {
      clearGuestData()
      counts.value = { records: 0, resumes: 0 }
      ElMessage.success('本地数据已清除')
    })
    .catch(() => {})
}

/* 头像：与侧边栏、个人信息页共用同一个响应式 ref */
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
    /* 用户取消 */
  }
}

const go = (path) => router.push(path)

onMounted(() => {
  username.value = localStorage.getItem('username') || '用户'
  isGuest.value = localStorage.getItem('guest_mode') === 'true'
  reloadAvatar()
  loadCounts()
})
</script>

<style scoped>
/* ===== 偏好设置 ===== */
.prefs {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.seg {
  display: inline-flex;
  align-self: flex-start;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  overflow: hidden;
}
.seg-btn {
  padding: 9px 20px;
  background: var(--surface);
  border: none;
  border-right: 1px solid var(--hairline);
  font-size: 13px;
  color: var(--body);
  cursor: pointer;
  transition: var(--slide-trans);
}
.seg-btn:last-child {
  border-right: none;
}
.seg-btn:hover {
  background: var(--canvas-2);
}
.seg-btn.active {
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}
.prefs-hint {
  font-size: 12px;
  color: var(--body-muted);
  line-height: 1.7;
}
.prefs-gap {
  margin-top: 12px;
}
.prefs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--hairline);
  border-radius: var(--rad-block);
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
}
.prefs-row-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.prefs-row-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--body-muted);
}
.danger-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--danger);
  border-radius: var(--r-lg);
  color: var(--danger);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}
.danger-btn:hover {
  background: var(--danger);
  color: var(--on-danger);
}
.prefs-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.ghost-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  color: var(--body);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}
.ghost-btn:hover {
  border-color: var(--accent);
  color: var(--accent-hover);
  transform: translateX(2px);
}

/* ===== 账户上下文卡 ===== */
.aside-card {
  display: flex;
  flex-direction: column;
}
.acct {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}
/* 上传的头像裁成圆形填满 */
.acct-avatar img {
  /* 绝对定位填满父容器：绕开 flex item 的 min-width:auto 内容下限，
     尺寸完全由父容器 padding box 决定，因此不会溢出或偏移。 */
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 20px;
  padding: 11px 14px;
  background: transparent;
  border: 1px solid var(--danger-line);
  border-radius: var(--rad-block);
  color: var(--danger);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}

.logout-btn:hover {
  background: var(--danger-wash);
  border-color: var(--danger);
}

.acct-avatar {
  /* 定位上下文 + 圆形硬裁剪：img 是绝对定位，容器必须 relative；
     overflow:hidden 保证任何意外尺寸都被裁进圆内。 */
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--canvas);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}
.acct-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.acct-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.acct-role {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
  color: var(--body-muted);
}
.stat-list {
  margin-top: 10px;
}
.stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--hairline);
}
.stat-row dt {
  font-size: 12px;
  color: var(--body-muted);
}
.stat-row dd {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.aside-gap {
  margin-top: 24px;
  margin-bottom: 6px;
}
.aside-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--hairline);
  font-size: 13px;
  color: var(--body);
  cursor: pointer;
  transition: var(--slide-trans);
}
.aside-link:last-child {
  border-bottom: none;
}
.aside-link:hover {
  color: var(--accent-hover);
  transform: translateX(3px);
}
.aside-link-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--body-muted);
}
</style>
