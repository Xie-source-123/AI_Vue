<template>
  <div class="card ability">
    <div class="head">
      <h4 v-if="title">{{ title }}</h4>
      <span v-if="rows.length" class="head-note">0–100 分</span>
    </div>

    <div v-if="rows.length" class="list">
      <div v-for="(s, i) in rows" :key="s.name" class="item">
        <div class="top">
          <span class="name">{{ s.name }}</span>
          <span class="val">
            <b>{{ shown[i] ?? 0 }}</b>
            <i>/100</i>
          </span>
        </div>
        <div class="track">
          <div class="fill" :class="s.tone" :style="{ width: (shown[i] ?? 0) + '%' }" />
        </div>
        <span class="hint">{{ s.hint }}</span>
      </div>
    </div>

    <p v-else class="empty">完成简历智能分析后展示能力画像</p>

    <p v-if="rows.length" class="legend">分值越高代表该维度特征越明显</p>

    <!-- 评分报告：仅在面试工作台启用。
         报告要带「本次面试」的问答与逐轮评分，所以必须先提交面试才有数据；
         未提交时给出提示而不是留一个点了会失败的按钮。 -->
    <template v-if="allowReport">
      <div v-if="submitted" class="report">
        <div class="report-meta">
          <span class="rm-pos">{{ submitted.position }}</span>
          <span class="rm-sub">
            {{ submitted.rounds }} 轮 · 平均 {{ submitted.avg == null ? '—' : submitted.avg }} 分
          </span>
        </div>
        <button
          class="gen-report press-md focus-ring"
          :disabled="reporting"
          @click="generateReport"
        >
          {{ reporting ? '生成中…' : '生成评分报告' }}
        </button>
        <p v-if="reportMsg" class="report-msg" :class="{ err: reportErr }">{{ reportMsg }}</p>
      </div>
      <p v-else class="report-empty">提交面试后，可在这里生成评分报告</p>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { latestAiScores } from '@/utils/metrics.js'
import { getUserItem, setUserItem } from '@/utils/userStorage.js'
import { submitted } from '@/utils/interviewSession.js'

defineProps({
  title: { type: String, default: '' },
  /* 只有面试工作台需要评分报告 —— 数据工作台复用本组件展示能力维度，
     不该出现「提交面试后可生成报告」这种跨工作台的提示 */
  allowReport: { type: Boolean, default: false }
})

const DIMS = [
  { name: '优势', tone: 'accent', hint: '数值越高，简历中的优势越突出' },
  { name: '岗位匹配', tone: 'accent', hint: '数值越高，与目标岗位越贴合' },
  { name: '不足', tone: 'warn', hint: '数值越高，这个短板越需要补齐' }
]

const rows = ref([])
/* 显示值：由 rAF 从 0 推到目标值。
   原来宽度直接绑定最终值，CSS 的 transition 没有起始状态可插值，
   所以增长动画从来没生效过 —— 条子是瞬间蹦到终值的。 */
const shown = ref([])

let raf = 0

function grow() {
  const targets = rows.value.map((r) => r.value)
  const duration = 720
  const t0 = performance.now()

  shown.value = targets.map(() => 0)

  const step = (now) => {
    const p = Math.min((now - t0) / duration, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    shown.value = targets.map((v) => Math.round(v * eased))
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => {
  const s = latestAiScores()
  if (!s) return
  rows.value = DIMS.map((d) => ({
    name: d.name,
    tone: d.tone,
    hint: d.hint,
    value: Math.max(0, Math.min(100, Number(s[d.name]) || 0))
  }))
  grow()
})

onBeforeUnmount(() => cancelAnimationFrame(raf))

/* =====================================================================
   评分报告
   接口地址与 InterviewChat 的会话服务同源（本地 8000 端口）。
   后端若改用别的路径，只改这一行即可。
   ===================================================================== */
const REPORT_ENDPOINT = 'http://localhost:8000/api/report/generate'

const reporting = ref(false)
const reportMsg = ref('')
const reportErr = ref(false)

function readReports() {
  try {
    const v = JSON.parse(getUserItem('interview_reports') || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** 把纯文本报告按【小标题】或 Markdown 标题切成小节，供历史记录展示 */
function toSections(text) {
  const out = []
  let cur = null
  for (const raw of String(text).split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^【(.+?)】$/) || line.match(/^#{1,4}\s*(.+)$/)
    if (m) {
      cur = { title: m[1].trim(), content: '' }
      out.push(cur)
    } else if (cur) {
      cur.content = cur.content ? cur.content + '\n' + line : line
    } else {
      cur = { title: '总览', content: line }
      out.push(cur)
    }
  }
  return out
    .map((s) => ({ title: s.title, content: s.content.trim() }))
    .filter((s) => s.title || s.content)
}

async function generateReport() {
  if (reporting.value) return
  reporting.value = true
  reportErr.value = false
  reportMsg.value = ''

  try {
    const userId = localStorage.getItem('username') || 'local_user_001'
    const dimensions = rows.value.map((r) => ({ name: r.name, value: r.value }))

    /* 两组数据都给后端，由 Dify 决定用哪组：
       本次面试的逐轮问答与评分 + 简历分析的三维分数 */
    const res = await fetch(REPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        position: submitted.value.position,
        rounds: submitted.value.rounds,
        avg: submitted.value.avg,
        qa: submitted.value.qa,
        scores: dimensions
      })
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)

    const data = await res.json()
    const raw = data.report || data.summary || data.content || data.text || ''
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)
    const sections =
      Array.isArray(data.sections) && data.sections.length
        ? data.sections.map((s) => ({
            title: s.title || '',
            content: s.content || ''
          }))
        : toSections(text)

    const list = readReports()
    list.unshift({
      id: 'rep-' + Date.now(),
      time: Date.now(),
      /* 关联到具体某次面试，历史记录里能对上号 */
      interviewId: submitted.value.id,
      position: submitted.value.position,
      rounds: submitted.value.rounds,
      avg: submitted.value.avg,
      name: submitted.value.name,
      scores: dimensions,
      summary: typeof data.summary === 'string' ? data.summary : '',
      sections
    })
    setUserItem('interview_reports', JSON.stringify(list))
    reportMsg.value = '报告已生成，可在「历史记录」中查看'
  } catch (e) {
    reportErr.value = true
    reportMsg.value = '生成失败：' + e.message + '（请确认本地 8000 端口评分服务已启动）'
  } finally {
    reporting.value = false
  }
}
</script>

<style scoped>
.ability {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.head-note {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
  color: var(--body-muted);
}
.list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.item {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.val {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
}
.val b {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1;
}
.val i {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--body-muted);
}
.track {
  height: 10px;
  border-radius: var(--rad-pill);
  background: var(--hairline);
  overflow: hidden;
}
.fill {
  position: relative;
  height: 100%;
  border-radius: var(--rad-pill);
  overflow: hidden;
  /* 宽度由 rAF 逐帧驱动，不能再挂 transition（会与逐帧更新打架） */
}
/* 原来渐变末端是春芽浅绿 / 亮琥珀，过于鲜艳且与主题脱节；
   改为同色系的深浅过渡，收敛到草木青与深琥珀 */
.fill.accent {
  background: linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%);
}
.fill.warn {
  background: linear-gradient(90deg, var(--warn-deep) 0%, var(--warn) 100%);
}
/* 增长时扫过一道高光，只跑一次。
   fill-mode: both 让动画结束后停在 translateX(100%)（已移出可视区）。 */
.fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  animation: bar-shine 1s var(--ease-out) 0.2s 1 both;
}
@keyframes bar-shine {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
.hint {
  font-size: 11px;
  color: var(--body-muted);
}
.empty {
  padding: 12px 0;
  font-size: 12px;
  color: var(--body-muted);
}
.legend {
  padding-top: 14px;
  border-top: 1px solid var(--hairline);
  font-size: 11px;
  color: var(--body-muted);
}
.report {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--hairline);
}
.report-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.rm-pos {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-sub {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--body-muted);
}
.report-empty {
  padding-top: 14px;
  border-top: 1px solid var(--hairline);
  font-size: 11px;
  line-height: 1.6;
  color: var(--body-muted);
}
.gen-report {
  width: 100%;
  padding: 12px 14px;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  border-radius: var(--rad-block);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}
.gen-report:hover:not(:disabled) {
  background: var(--accent-hover);
}
.gen-report:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.report-msg {
  font-size: 11px;
  line-height: 1.6;
  color: var(--accent-hover);
}
.report-msg.err {
  color: var(--danger);
}
</style>