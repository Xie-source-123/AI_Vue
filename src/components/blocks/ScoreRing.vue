<template>
  <div class="card card-hero card-static score-ring">
    <div class="head">
      <h4 v-if="title">{{ title }}</h4>
      <span v-if="hasData" class="head-note">平均 {{ mean }} 分</span>
    </div>
    <div v-show="hasData" ref="el" class="chart" />

    <div v-if="hasData" class="caption">
      <span class="cap-item"><b>{{ highCount }}</b> 场优秀</span>
      <span class="cap-sep" />
      <span class="cap-item"><b>{{ lowCount }}</b> 场待提升</span>
      <span class="cap-sep" />
      <span class="cap-item"><b>{{ highPct }}%</b> 优良率</span>
    </div>

    <p v-if="!hasData" class="empty">面试记录里还没有评分数据</p>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { sessionList } from '@/utils/metrics.js'
import { chartTokens } from '@/utils/chartTheme.js'
import { useEchart } from '@/utils/echartMount.js'
import { useGotoItem } from '@/utils/gotoItem.js'
import { useTheme } from '@/theme/useTheme.js'

defineProps({ title: { type: String, default: '' } })

const el = ref(null)
const { ensure } = useEchart(el)
const gotoItem = useGotoItem()
const hasData = ref(false)
const mean = ref(0)
const highCount = ref(0)
const lowCount = ref(0)
const highPct = ref(0)
const MONO = 'JetBrains Mono, ui-monospace, monospace'

const BUCKETS = [
  { name: '优秀 ≥85', min: 85, tone: 'accent' },
  { name: '良好 70-84', min: 70, tone: 'accentSoft' },
  { name: '及格 60-69', min: 60, tone: 'warn' },
  { name: '待提升 <60', min: -1, tone: 'muted' }
]

function buildData() {
  const avgs = sessionList()
    .filter((r) => r.avg != null)
    .map((r) => r.avg)
  if (!avgs.length) return null

  const t = chartTokens()
  const color = (tone) =>
    ({ accent: t.accent, accentSoft: t.accentSoft, warn: t.warn, muted: t.hairline }[tone] ||
    t.accent)

  const data = BUCKETS.map((b, i) => {
    const upper = i === 0 ? Infinity : BUCKETS[i - 1].min
    const count = avgs.filter((v) => v >= b.min && v < upper).length
    return { name: b.name, value: count, itemStyle: { color: color(b.tone) } }
  }).filter((d) => d.value > 0)

  return {
    data,
    avgs,
    total: avgs.length,
    mean: Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length)
  }
}

function summarize(avgs) {
  const high = avgs.filter((v) => v >= 85).length
  const good = avgs.filter((v) => v >= 70 && v < 85).length
  const low = avgs.filter((v) => v < 60).length
  return {
    high,
    low,
    pct: avgs.length ? Math.round(((high + good) / avgs.length) * 100) : 0
  }
}

async function render() {
  const built = buildData()
  if (!built) {
    hasData.value = false
    return
  }
  hasData.value = true
  mean.value = built.mean
  const summary = summarize(built.avgs)
  highCount.value = summary.high
  lowCount.value = summary.low
  highPct.value = summary.pct

  /* 等 v-show 生效后再量尺寸，否则拿到 0×0 */
  const chart = await ensure()
  if (!chart) return
  const t = chartTokens()

  /* 点击图形下钻到历史记录。
     off 先清空，避免切换主题重绘时重复绑定同一个回调。 */
  chart.off('click')
  chart.on('click', () => gotoItem('history'))

  chart.setOption(
    {
      tooltip: {
        trigger: 'item',
        formatter: '{b}<br/>{c} 场（{d}%）',
        backgroundColor: t.canvas,
        borderColor: t.hairline,
        borderWidth: 1,
        textStyle: { color: t.ink, fontSize: 12 }
      },
      title: {
        text: String(built.total),
        subtext: '场面试',
        left: 'center',
        top: '28%',
        textAlign: 'center',
        textStyle: {
          color: t.ink,
          fontSize: 34,
          fontWeight: 700,
          fontFamily: MONO,
          align: 'center'
        },
        subtextStyle: { color: t.muted, fontSize: 11, align: 'center' }
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 12,
        textStyle: { color: t.muted, fontSize: 11 },
        formatter: (name) => {
          const hit = built.data.find((d) => d.name === name)
          return hit ? `${name}　${hit.value}` : name
        }
      },
      series: [
        {
          type: 'pie',
          radius: ['54%', '76%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: t.canvas, borderWidth: 2, borderRadius: 4 },
          label: {
            show: true,
            formatter: '{c}',
            color: t.body,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: MONO
          },
          labelLine: { length: 6, length2: 6, lineStyle: { color: t.hairline } },
          emphasis: { scale: true, scaleSize: 6 },
          data: built.data
        }
      ]
    },
    true
  )
  chart.resize()
}

const { isDark } = useTheme()
watch(isDark, () => render())

onMounted(() => render())
</script>

<style scoped>
.score-ring {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
.chart {
  cursor: pointer;
  width: 100%;
  height: 320px;
}
.caption {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
}
.cap-item {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 11px;
  color: var(--body-muted);
}
.cap-item b {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
.cap-sep {
  width: 1px;
  height: 14px;
  background: var(--hairline);
}
.empty {
  padding: 30px 0;
  font-size: 12px;
  color: var(--body-muted);
}
</style>
