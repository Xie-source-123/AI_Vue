<template>
  <div class="tp">
    <p class="tp-note">
      这里调的配色只影响<b>你自己这个账号</b>，保存在本机浏览器里，换账号各是各的。
      在对应的工作台里才会看到效果；当前所在的界面会实时预览。
    </p>

    <div v-for="ws in TARGETS" :key="ws.ws" class="tp-block">
      <div class="tp-head">
        <span class="tp-title">{{ ws.label }}</span>
        <span class="tp-state">{{ isCustom(ws.ws) ? '已自定义' : `默认 · ${ws.sub}` }}</span>
      </div>

      <div class="tp-cols">
        <div v-for="theme in THEMES" :key="theme.key" class="tp-col">
          <div class="tp-col-head">{{ theme.label }}</div>

          <label v-for="f in FIELDS" :key="f.key" class="tp-field">
            <span class="tp-label">{{ f.label }}</span>
            <el-color-picker
              v-model="uiTheme[ws.ws][theme.key][f.key]"
              size="small"
              :predefine="PRESETS"
            />
            <code class="tp-hex">{{ uiTheme[ws.ws][theme.key][f.key] }}</code>
          </label>

          <!-- 派生结果预览：改上面的输入色，这一排立刻跟着变 -->
          <div class="tp-chips">
            <span
              v-for="c in chips(ws.ws, theme.key)"
              :key="c.k"
              class="tp-chip"
              :style="{ background: c.bg, boxShadow: c.glow }"
              :title="c.tip"
            />
          </div>
          <div class="tp-chip-labels">
            <span>主色</span><span>hover</span><span>柔色</span><span>卡片底</span><span>边框</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tp-actions">
      <el-button type="primary" :loading="saving" @click="save">保存我的配色</el-button>
      <el-button @click="reset">恢复默认</el-button>
      <span class="tp-hint">保存后立即生效，并只作用于当前账号</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  THEME_TARGETS,
  DEFAULT_UI_THEME,
  uiTheme,
  deriveTokens,
  setActiveWorkspaces,
  applyUserTheme,
  saveUserTheme,
  clearUserTheme
} from '@/theme/uiTheme.js'

/* 用户只配自己看得到的三个工作台 —— 管理后台的配色不归用户管 */
const TARGETS = THEME_TARGETS.filter((t) => t.ws !== 'admin')

const THEMES = [
  { key: 'light', label: '浅色主题' },
  { key: 'dark', label: '深色主题' }
]

const FIELDS = [
  { key: 'accent', label: '主色' },
  { key: 'hover', label: 'hover' },
  { key: 'highlight', label: '点缀色' }
]

const PRESETS = [
  '#e6f4ff', '#2b79b6',
  '#fff1f0', '#d14339',
  '#feffe6', '#75781c',
  '#c8a45c', '#3f4753'
]

const saving = ref(false)
const snapshot = ref('')

const isCustom = (ws) => JSON.stringify(uiTheme.value[ws]) !== JSON.stringify(DEFAULT_UI_THEME[ws])

/* 预览用的是真正落地那套 deriveTokens —— 预览和保存必须同一份算法，
   否则会出现「看着挺好、存下去不一样」。 */
function chips(ws, themeKey) {
  const cfg = uiTheme.value[ws][themeKey]
  const t = deriveTokens(cfg, themeKey)
  return [
    { k: 'accent', bg: t['--accent'], tip: `主色 ${t['--accent']}` },
    { k: 'hover', bg: t['--accent-hover'], tip: `hover ${t['--accent-hover']}` },
    { k: 'soft', bg: t['--accent-soft'], tip: `柔色 ${t['--accent-soft']}` },
    { k: 'card', bg: t['--card-grad'], tip: `卡片底 ${t['--card-grad']}` },
    {
      k: 'line',
      bg: 'transparent',
      glow: `inset 0 0 0 1px ${t['--accent-line']}, 0 0 10px ${t['--glow']}`,
      tip: '边框与光环'
    }
  ]
}

onMounted(() => {
  snapshot.value = JSON.stringify(uiTheme.value)
  // 把三个工作台都加入生效集合，这样改哪个都能立刻看到（当前所在的那个直接生效）
  setActiveWorkspaces(TARGETS.map((t) => t.ws))
})

onBeforeUnmount(() => {
  // 没保存就走人：把全局那份还原，别把临时预览带去别的页面
  if (JSON.stringify(uiTheme.value) !== snapshot.value) restore()
})

function restore() {
  uiTheme.value = JSON.parse(snapshot.value)
}

function save() {
  saving.value = true
  try {
    if (!saveUserTheme(uiTheme.value)) {
      ElMessage.error('保存失败：浏览器本地存储不可用（可能是隐私模式）')
      return
    }
    snapshot.value = JSON.stringify(uiTheme.value)
    ElMessage.success('已保存，只对当前账号生效')
  } finally {
    saving.value = false
  }
}

function reset() {
  TARGETS.forEach(({ ws }) => {
    uiTheme.value[ws] = JSON.parse(JSON.stringify(DEFAULT_UI_THEME[ws]))
  })
  clearUserTheme()
  snapshot.value = JSON.stringify(uiTheme.value)
  applyUserTheme()
  ElMessage.success('已恢复内置配色')
}
</script>

<style scoped>
.tp {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.tp-note {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.9;
  color: var(--body-muted);
}
.tp-note b {
  color: var(--ink);
}

.tp-block {
  padding: 14px 16px;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: var(--canvas-2);
}
.tp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.tp-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.tp-state {
  font-size: 12px;
  color: var(--body-muted);
}

.tp-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}
.tp-col-head {
  font-size: 12px;
  font-weight: 600;
  color: var(--body-muted);
  margin-bottom: 8px;
}

.tp-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
  cursor: pointer;
}
.tp-label {
  width: 52px;
  flex-shrink: 0;
  font-size: 12.5px;
  color: var(--body);
}
.tp-hex {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--body-muted);
}

.tp-chips {
  display: flex;
  gap: 5px;
  margin-top: 10px;
}
.tp-chip {
  width: 34px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--hairline);
  box-sizing: border-box;
}
.tp-chip-labels {
  display: flex;
  gap: 5px;
  margin-top: 5px;
}
.tp-chip-labels span {
  width: 34px;
  flex-shrink: 0;
  font-size: 10px;
  text-align: center;
  color: var(--body-muted);
  letter-spacing: -0.3px;
}

.tp-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.tp-hint {
  font-size: 12px;
  color: var(--body-muted);
}
</style>
