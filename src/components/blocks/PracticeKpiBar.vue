<template>
  <div class="card card-hero card-static kpi-bar">
    <div v-for="k in items" :key="k.label" class="kpi-cell">
      <div class="kpi-head">
        <span class="kpi-label">{{ k.label }}</span>
      </div>

      <div class="kpi-num">
        <b class="kpi-val" :class="{ 'is-name': k.isName }">{{ k.value }}</b>
        <em v-if="k.unit" class="kpi-unit">{{ k.unit }}</em>
      </div>

      <span class="kpi-sub">{{ k.sub }}</span>

      <!-- 有百分比就给一条进度轨，没有就留空占位，保证四格高度一致 -->
      <div class="kpi-track">
        <span
          v-if="k.percent != null"
          class="kpi-fill"
          :style="{ width: safePct(k.percent) + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchPracticeRecordsAPI, fetchPracticeStatsAPI } from '@/api/index.js'

const props = defineProps({
  mode: { type: String, default: 'practice' } // practice | exams
})

const practice = ref([])
const exams = ref([])
const stats = ref({ progress: [], examPass: [], exam: { avgScore: 0 } })

function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const today = todayStr()

/** 取百分比最高 / 最低的知识点（只统计有题目的） */
function extreme(list, pickMax) {
  const valid = (list || []).filter((x) => Number(x.total) > 0)
  if (!valid.length) return null
  return valid.reduce((a, b) =>
    pickMax
      ? Number(b.percent) > Number(a.percent)
        ? b
        : a
      : Number(b.percent) < Number(a.percent)
        ? b
        : a
  )
}

const safePct = (v) => Math.max(0, Math.min(100, Number(v) || 0))

const items = computed(() => {
  if (props.mode === 'exams') {
    const todayN = exams.value.filter((e) => String(e.at || '').startsWith(today)).length
    const total = exams.value.length
    const top = extreme(stats.value.examPass, true)
    const low = extreme(stats.value.examPass, false)
    return [
      { label: '今日考试', value: todayN, unit: '次', sub: `累计 ${total} 次` },
      {
        label: '通过率最高',
        value: top ? top.category : '—',
        isName: true,
        sub: top ? `${top.percent}%` : '还没有考试',
        percent: top ? top.percent : null
      },
      {
        label: '通过率最低',
        value: low ? low.category : '—',
        isName: true,
        sub: low ? `${low.percent}%` : '还没有考试',
        percent: low ? low.percent : null
      },
      {
        label: '总考试',
        value: total,
        unit: '次',
        sub: `平均 ${stats.value.exam?.avgScore ?? 0} 分`
      }
    ]
  }

  const todayN = practice.value.filter((r) => String(r.at || '').startsWith(today)).length
  const total = practice.value.length
  const top = extreme(stats.value.progress, true)
  const low = extreme(stats.value.progress, false)
  const touched = (stats.value.progress || []).filter((p) => Number(p.correct) > 0).length
  return [
    { label: '今日练习', value: todayN, unit: '题', sub: `累计 ${total} 题` },
    {
      label: '完成度最高',
      value: top ? top.category : '—',
      isName: true,
      sub: top ? `${top.percent}%` : '还没有练习',
      percent: top ? top.percent : null
    },
    {
      label: '完成度最低',
      value: low ? low.category : '—',
      isName: true,
      sub: low ? `${low.percent}%` : '还没有练习',
      percent: low ? low.percent : null
    },
    { label: '总练习', value: total, unit: '题', sub: `涉及 ${touched} 个知识点` }
  ]
})

onMounted(async () => {
  try {
    const [rec, st] = await Promise.all([fetchPracticeRecordsAPI(), fetchPracticeStatsAPI()])
    practice.value = rec.data.practice || []
    exams.value = rec.data.exam || []
    stats.value = st.data || { progress: [], examPass: [], exam: { avgScore: 0 } }
  } catch {
    /* 拿不到就显示 0，不阻塞页面 */
  }
})
</script>

<style scoped>
.kpi-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  color: var(--accent);
}
.kpi-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 22px;
  border-left: 1px solid var(--hairline);
  min-width: 0;
}
.kpi-cell:first-of-type {
  border-left: none;
  padding-left: 0;
}
.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kpi-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--body-muted);
}
.kpi-num {
  display: flex;
  align-items: baseline;
  gap: 3px;
  min-width: 0;
}
.kpi-val {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 38px;
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1;
  color: var(--ink);
}
/* 知识点名可能很长，用小一号字并截断 */
.kpi-val.is-name {
  font-size: 19px;
  letter-spacing: 0;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kpi-unit {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--body-muted);
}
.kpi-sub {
  font-size: 11px;
  color: var(--body-muted);
}
.kpi-track {
  height: 5px;
  border-radius: var(--rad-pill);
  background: var(--hairline);
  overflow: hidden;
  margin-top: 2px;
}
.kpi-fill {
  display: block;
  height: 100%;
  border-radius: var(--rad-pill);
  background: linear-gradient(90deg, var(--accent), var(--accent-soft));
  transition: width var(--dur-slow) var(--ease-out);
}

@media (max-width: 900px) {
  .kpi-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 0;
  }
  .kpi-cell:nth-of-type(3) {
    border-left: none;
    padding-left: 0;
  }
  .kpi-val {
    font-size: 30px;
  }
  .kpi-val.is-name {
    font-size: 16px;
  }
}
</style>
