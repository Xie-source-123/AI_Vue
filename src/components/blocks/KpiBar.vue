<template>
  <div class="card card-hero card-static kpi-bar">
    <svg class="spark-defs" width="0" height="0" aria-hidden="true">
      <defs>
        <linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.32" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>

    <button
      v-for="k in items"
      :key="k.label"
      class="kpi-cell press-md focus-ring"
      :aria-label="k.hintText"
      @click="go(k)"
    >
      <div class="kpi-head">
        <span class="kpi-label">{{ k.label }}</span>
        <span class="kpi-delta" :class="k.dir">{{ k.deltaText }}</span>
      </div>

      <div class="kpi-num">
        <b class="kpi-val">{{ k.value }}</b>
        <em v-if="k.unit" class="kpi-unit">{{ k.unit }}</em>
      </div>

      <span class="kpi-sub">{{ k.sub }}</span>

      <svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
        <polygon class="spark-area" :points="areaPoints(k.series)" />
        <polyline class="spark-line" :points="linePoints(k.series)" />
      </svg>
      <span class="kpi-go">{{ k.hintText }}</span>
    </button>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { useGotoItem } from '@/utils/gotoItem.js'
import {
  DAY,
  dayStart,
  dailySessions,
  dailyAvgScore,
  cumulativeResumes,
  cumulative,
  fillMissing,
  sessionList,
  resumeList,
  resumeTime
} from '@/utils/metrics.js'

const items = reactive([])

/* KPI 只是入口，明细在对应工作台 */
const TARGETS = [
  { to: '/app/interview', item: 'history', hintText: '查看历史记录' },
  { to: '/app/interview', item: 'history', hintText: '查看历史记录' },
  { to: '/app/interview', item: 'resume', hintText: '查看简历管理' },
  { to: '/app/interview', item: 'history', hintText: '查看历史记录' }
]

const goto = useGotoItem()
const go = (k) => goto(k.item, k.to, 'InterviewWorkspace')

const inWin = (t, from, to) => t != null && t >= from && t <= to

function linePoints(series) {
  if (!Array.isArray(series) || series.length < 2) return ''
  const max = Math.max(...series)
  const min = Math.min(...series)
  const span = max - min || 1
  const step = 100 / (series.length - 1)
  return series
    .map((v, i) => `${(i * step).toFixed(2)},${(26 - ((v - min) / span) * 22).toFixed(2)}`)
    .join(' ')
}

function areaPoints(series) {
  const line = linePoints(series)
  return line ? `0,28 ${line} 100,28` : ''
}

function countUp(index, target) {
  const start = items[index].value
  if (start === target) return
  const t0 = performance.now()
  const dur = 700
  const step = (now) => {
    const p = Math.min((now - t0) / dur, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    items[index].value = Math.round(start + (target - start) * eased)
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function deltaInfo(delta, unit) {
  if (delta > 0) return { dir: 'up', deltaText: `▲ ${delta}${unit}` }
  if (delta < 0) return { dir: 'down', deltaText: `▼ ${Math.abs(delta)}${unit}` }
  return { dir: 'flat', deltaText: '— 持平' }
}

onMounted(() => {
  const all = sessionList()
  const t0 = dayStart(Date.now())
  const week0 = t0 - 6 * DAY
  const prev0 = t0 - 13 * DAY

  const daily = dailySessions(7)
  const resumes = resumeList()

  const todayN = all.filter((r) => r.date === t0).length
  const ydayN = all.filter((r) => r.date === t0 - DAY).length
  const weekN = all.filter((r) => inWin(r.date, week0, t0)).length
  const prevN = all.filter((r) => inWin(r.date, prev0, week0 - DAY)).length
  const resWeek = resumes.filter((it) => inWin(resumeTime(it), week0, t0)).length
  const resPrev = resumes.filter((it) => inWin(resumeTime(it), prev0, week0 - DAY)).length

  const scored = all.filter((r) => r.avg != null)
  const lastAvg = scored.length ? scored[scored.length - 1].avg : 0
  const prevAvg = scored.length > 1 ? scored[scored.length - 2].avg : lastAvg

  items.length = 0
  items.push(
    {
      label: '今日面试',
      value: 0,
      target: todayN,
      unit: '场',
      sub: `昨日 ${ydayN} 场`,
      series: daily,
      ...deltaInfo(todayN - ydayN, '')
    },
    {
      label: '面试总数',
      value: 0,
      target: all.length,
      unit: '场',
      sub: `近 7 天 ${weekN} 场`,
      series: cumulative(daily),
      ...deltaInfo(weekN - prevN, '')
    },
    {
      label: '简历数量',
      value: 0,
      target: resumes.length,
      unit: '份',
      sub: `本周新增 ${resWeek} 份`,
      series: cumulativeResumes(7),
      ...deltaInfo(resWeek - resPrev, '')
    },
    {
      label: '平均评分',
      value: 0,
      target: lastAvg,
      unit: '分',
      sub: scored.length > 1 ? `上一场 ${prevAvg} 分` : '暂无对比场次',
      series: fillMissing(dailyAvgScore(7)),
      ...(scored.length > 1
        ? deltaInfo(lastAvg - prevAvg, '')
        : { dir: 'flat', deltaText: '— 首场' })
    }
  )

  items.forEach((k, i) => Object.assign(k, TARGETS[i]))
  items.forEach((k, i) => countUp(i, k.target))
})
</script>

<style scoped>
.kpi-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  /* 供 sparkline 的 currentColor 描边与渐变取色 */
  color: var(--accent);
}
.spark-defs {
  position: absolute;
  width: 0;
  height: 0;
}
.kpi-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 22px;
  /* 现在是 <button>，需要清掉浏览器默认样式 */
  border: none;
  border-left: 1px solid var(--hairline);
  background: transparent;
  text-align: left;
  min-width: 0;
  color: var(--accent);
  cursor: pointer;
  transition: var(--slide-trans);
}
.kpi-cell:first-of-type {
  border-left: none;
  padding-left: 0;
}
/* 底部一道滑入的强调线，提示「这里可以点」 */
.kpi-cell::after {
  content: '';
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: -8px;
  height: 2px;
  border-radius: var(--rad-pill);
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-base) var(--ease-out);
}
.kpi-cell:first-of-type::after {
  left: 0;
}
.kpi-cell:hover::after {
  transform: scaleX(1);
}
.kpi-cell:hover .kpi-label {
  color: var(--accent-hover);
}
/* 常驻占位（不隐藏布局），悬停才浮现，避免高度跳动 */
.kpi-go {
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  color: var(--accent-hover);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.kpi-cell:hover .kpi-go {
  opacity: 1;
  transform: translateX(0);
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
.kpi-delta {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: var(--rad-pill);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.kpi-delta.up {
  color: var(--accent-hover);
  background: var(--accent-wash);
}
.kpi-delta.down {
  color: var(--danger);
  background: var(--danger-wash);
}
.kpi-delta.flat {
  color: var(--body-muted);
  background: var(--muted-wash);
}
.kpi-num {
  display: flex;
  align-items: baseline;
  gap: 3px;
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
.spark {
  display: block;
  width: 100%;
  height: 30px;
  margin-top: 2px;
}
.spark-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.spark-area {
  fill: url(#kpiSparkFill);
  stroke: none;
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
}
</style>
