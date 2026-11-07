<template>
  <div class="card hist">
    <!-- ===================== 列表态 ===================== -->
    <template v-if="!detail && !report">
      <div class="head">
        <h4 v-if="title">{{ title }}</h4>
        <div class="filters">
          <button
            v-for="f in FILTERS"
            :key="f.key"
            class="chip press-md focus-ring"
            :class="{ on: range === f.key }"
            @click="range = f.key"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- 统计条 -->
      <div class="stats">
        <div v-for="s in stats" :key="s.label" class="stat">
          <span class="stat-label">{{ s.label }}</span>
          <b class="stat-val">{{ s.value }}</b>
        </div>
      </div>

      <p v-if="!filtered.length" class="empty">
        还没有面试记录。完成一次模拟面试后，问答与评分会出现在这里。
      </p>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>岗位</th>
            <th>名称</th>
            <th>日期</th>
            <th class="ta-r">问答轮次</th>
            <th class="ta-r">平均分</th>
            <th class="ta-r">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.id" class="press-row focus-ring-inset" tabindex="0" @click="open(r)">
            <td><span class="tag">{{ r.position || '未指定' }}</span></td>
            <td class="ell">{{ r.name || '未命名记录' }}</td>
            <td class="mono">{{ fmtDate(r.date) }}</td>
            <td class="ta-r mono">{{ rounds(r) }}</td>
            <td class="ta-r mono">{{ avgScore(r) }}</td>
            <td class="ta-r">
              <button class="row-link press-md focus-ring" @click.stop="open(r)">查看</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 评分报告：由「实时评分」卡生成后落库到这里 ===== -->
      <div v-if="reports.length" class="reports">
        <div class="rep-head">
          <h4>评分报告</h4>
          <span class="rep-count mono">{{ reports.length }}</span>
        </div>
        <div class="rep-list">
          <div v-for="r in reports" :key="r.id" class="rep-item">
            <span v-if="r.position" class="rep-pos">{{ r.position }}</span>
            <span class="rep-time mono">{{ fmtDate(new Date(r.time)) }}</span>
            <span v-if="r.rounds != null" class="rep-rounds mono">{{ r.rounds }} 轮</span>
            <span class="rep-avg mono">{{ r.avg == null ? repAvg(r) : r.avg }} 分</span>
            <div class="rep-actions">
              <button class="row-link press-md focus-ring" @click="openReport(r)">查看</button>
              <button class="row-link del press-md focus-ring" @click="delReport(r.id)">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== 报告详情态 ===================== -->
    <template v-else-if="report">
      <div class="head">
        <button class="back press-md focus-ring" @click="report = null">← 返回列表</button>
        <span class="detail-meta">
          <span class="tag">评分报告</span>
          <span class="mono">{{ fmtDate(new Date(report.time)) }}</span>
        </span>
      </div>

      <!-- 关联的面试信息：报告是由哪次面试生成的 -->
      <div v-if="report.position || report.rounds != null" class="rep-interview">
        <span class="ri-item"><i>岗位</i><b>{{ report.position || '—' }}</b></span>
        <span class="ri-item"><i>问答轮次</i><b>{{ report.rounds == null ? '—' : report.rounds }}</b></span>
        <span class="ri-item"><i>面试均分</i><b>{{ report.avg == null ? '—' : report.avg }}</b></span>
      </div>

      <div v-if="report.scores && report.scores.length" class="rep-scores">
        <div v-for="s in report.scores" :key="s.name" class="rep-score">
          <span class="rep-score-name">{{ s.name }}</span>
          <b class="rep-score-val">{{ s.value }}</b>
        </div>
      </div>

      <p v-if="report.summary" class="rep-summary">{{ report.summary }}</p>

      <div class="qa">
        <div v-for="(sec, i) in report.sections" :key="i" class="rep-sec">
          <div class="rep-sec-title">{{ sec.title }}</div>
          <p class="qa-text">{{ sec.content }}</p>
        </div>
        <p v-if="!(report.sections && report.sections.length)" class="empty">
          这份报告没有可展示的内容。
        </p>
      </div>
    </template>

    <!-- ===================== 详情态 ===================== -->
    <template v-else>
      <div class="head">
        <button class="back press-md focus-ring" @click="detail = null">← 返回列表</button>
        <span class="detail-meta">
          <span class="tag">{{ detail.position || '未指定' }}</span>
          <span class="mono">{{ fmtDate(detail.date) }}</span>
          <span class="mono">{{ rounds(detail) }} 轮</span>
        </span>
      </div>

      <div class="qa">
        <div v-for="(m, i) in detail.messages || []" :key="i" class="qa-item" :class="m.role">
          <span class="qa-role">{{ m.role === 'user' ? '我的回答' : '面试官' }}</span>
          <div class="qa-body">
            <p class="qa-text">{{ m.content }}</p>
            <span v-if="m.score != null" class="qa-score mono">{{ m.score }} 分</span>
          </div>
        </div>
        <p v-if="!(detail.messages && detail.messages.length)" class="empty">
          这条记录里没有保存问答内容。
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getUserItem, setUserItem } from '@/utils/userStorage.js'

defineProps({ title: { type: String, default: '' } })

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' }
]

const records = ref([])
const reports = ref([])
const range = ref('all')
const detail = ref(null)
const report = ref(null)

const fmtDate = (d) => {
  if (!d) return '—'
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return d
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`
}

const rounds = (r) => {
  const list = r.messages || []
  return list.filter((m) => m.role === 'user').length || Math.ceil(list.length / 2)
}

const avgScore = (r) => {
  const scored = (r.messages || []).filter((m) => m.score != null)
  if (!scored.length) return '—'
  const sum = scored.reduce((a, m) => a + Number(m.score), 0)
  return `${Math.round(sum / scored.length)} 分`
}

const filtered = computed(() => {
  if (range.value === 'all') return records.value
  const days = range.value === '7d' ? 7 : 30
  const from = Date.now() - days * 86400000
  return records.value.filter((r) => {
    const t = new Date(r.date).getTime()
    return !Number.isNaN(t) && t >= from
  })
})

const stats = computed(() => {
  const total = filtered.value.length
  const roundsList = filtered.value.map(rounds)
  const avgRounds = roundsList.length
    ? Math.round((roundsList.reduce((a, b) => a + b, 0) / roundsList.length) * 10) / 10
    : 0
  const scores = filtered.value
    .map((r) => {
      const scored = (r.messages || []).filter((m) => m.score != null)
      if (!scored.length) return null
      return scored.reduce((a, m) => a + Number(m.score), 0) / scored.length
    })
    .filter((v) => v != null)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  return [
    { label: '会话数', value: total },
    { label: '平均轮次', value: avgRounds },
    { label: '平均分', value: avg == null ? '—' : `${avg}` },
    { label: '最近一次', value: filtered.value[0] ? fmtDate(filtered.value[0].date).slice(0, 10) : '—' }
  ]
})

const open = (r) => {
  detail.value = r
}

const load = () => {
  try {
    records.value = JSON.parse(getUserItem('interview_records') || '[]')
  } catch {
    records.value = []
  }
}

/* ===== 评分报告 ===== */
const repAvg = (r) => {
  const list = (r.scores || []).map((s) => Number(s.value)).filter((v) => !Number.isNaN(v))
  if (!list.length) return '—'
  return Math.round(list.reduce((a, b) => a + b, 0) / list.length)
}

const loadReports = () => {
  try {
    const v = JSON.parse(getUserItem('interview_reports') || '[]')
    reports.value = Array.isArray(v) ? v : []
  } catch {
    reports.value = []
  }
}

const openReport = (r) => {
  report.value = r
}

const delReport = (id) => {
  const next = reports.value.filter((r) => r.id !== id)
  reports.value = next
  setUserItem('interview_reports', JSON.stringify(next))
  if (report.value && report.value.id === id) report.value = null
}

onMounted(() => {
  load()
  loadReports()
})
watch(filtered, () => {
  if (detail.value && !filtered.value.includes(detail.value)) detail.value = null
})
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  gap: 6px;
}
.chip {
  padding: 5px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-pill);
  background: transparent;
  font-size: 12px;
  color: var(--body);
  cursor: pointer;
  transition: var(--slide-trans);
}
.chip:hover {
  border-color: var(--accent);
}
.chip.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}

/* 统计条 */
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 18px 0 4px;
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  border-left: 1px solid var(--hairline);
}
.stat:first-child {
  border-left: none;
  padding-left: 0;
}
.stat-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--body-muted);
}
.stat-val {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
}

/* 表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
}
.data-table th {
  padding: 8px 12px;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--body-muted);
  border-bottom: 1px solid var(--hairline);
}
.data-table td {
  padding: 12px;
  font-size: 13px;
  color: var(--body);
  border-bottom: 1px solid var(--hairline);
}
.data-table tbody tr {
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}
.data-table tbody tr:hover {
  background: var(--canvas-2);
}
.ta-r {
  text-align: right;
}
.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  color: var(--body-muted);
}
.ell {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag {
  display: inline-block;
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
  color: var(--body);
}
.row-link {
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--accent-hover);
  cursor: pointer;
}
.row-link:hover {
  text-decoration: underline;
}
.empty {
  padding: 32px 0;
  font-size: 12px;
  color: var(--body-muted);
  text-align: center;
}

/* 详情态 */
.back {
  padding: 6px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-soft);
  background: transparent;
  font-size: 12px;
  color: var(--body);
  cursor: pointer;
  transition: var(--slide-trans);
}
.back:hover {
  border-color: var(--accent);
  color: var(--accent-hover);
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.qa {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.qa-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.qa-role {
  width: 64px;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
  color: var(--body-muted);
  padding-top: 3px;
}
.qa-item.user .qa-role {
  color: var(--accent-hover);
}
.qa-body {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--rad-block);
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
}
.qa-item.user .qa-body {
  background: var(--surface);
}
.qa-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
}
.qa-score {
  display: inline-block;
  margin-top: 8px;
  color: var(--accent-hover);
}
/* ===== 评分报告 ===== */
.reports {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--hairline);
}
.rep-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.rep-count {
  font-size: 10px;
  color: var(--body-muted);
}
.rep-list {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}
.rep-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--rad-block);
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
}
.rep-item + .rep-item {
  margin-top: 8px;
}
.rep-pos {
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: var(--rad-pill);
  background: var(--accent-wash);
  color: var(--accent-hover);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.rep-rounds {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--body-muted);
}

/* 报告详情里的面试元信息 */
.rep-interview {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.ri-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--rad-block);
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
  min-width: 96px;
}
.ri-item i {
  font-style: normal;
  font-size: 11px;
  color: var(--body-muted);
}
.ri-item b {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1.2;
}
.rep-time {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: var(--body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rep-avg {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-hover);
}
.rep-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.row-link.del {
  color: var(--danger);
}
.row-link.del:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* ===== 报告详情 ===== */
.rep-scores {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.rep-score {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border: 1px solid var(--hairline);
  border-radius: var(--rad-block);
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
  min-width: 96px;
}
.rep-score-name {
  font-size: 11px;
  color: var(--body-muted);
}
.rep-score-val {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1;
}
.rep-summary {
  margin-top: 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--body);
}
.rep-sec {
  padding: 14px 0;
  border-bottom: 1px solid var(--hairline);
}
.rep-sec:last-child {
  border-bottom: none;
}
.rep-sec-title {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--body-muted);
  margin-bottom: 8px;
}</style>
