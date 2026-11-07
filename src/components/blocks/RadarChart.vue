<template>
  <div class="card card-hero card-static radar">
    <div class="head">
      <h4 v-if="title">{{ title }}</h4>
      <span class="head-note">短板控制 = 100 − 不足</span>
    </div>

    <div v-show="hasData" ref="el" class="chart" />

    <template v-if="hasData">
      <div class="caption">
        <span class="cap-item"><b>{{ total }}</b> 场累计</span>
        <span class="cap-sep" />
        <span class="cap-item"><b>{{ active }}</b> 天活跃</span>
        <span class="cap-sep" />
        <span class="cap-item"><b>{{ answerAvg }}</b> 答题均分</span>
      </div>
    </template>

    <p v-if="!hasData" class="empty">完成简历智能分析后展示能力画像</p>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import { latestAiScores, sessionList, activeDays } from '@/utils/metrics.js'
import { chartTokens, alpha } from '@/utils/chartTheme.js'
import { useEchart } from '@/utils/echartMount.js'
import { useGotoItem } from '@/utils/gotoItem.js'
import { useTheme } from '@/theme/useTheme.js'

defineProps({ title: { type: String, default: '' } })

const el = ref(null)
const { ensure } = useEchart(el)
const gotoItem = useGotoItem()
const hasData = ref(false)
const total = ref(0)
const active = ref(0)
const answerAvg = ref(0)
const MONO = 'JetBrains Mono, ui-monospace, monospace'

const INDICATOR = [
  { name: '优势', max: 100 },
  { name: '岗位匹配', max: 100 },
  { name: '答题均分', max: 100 },
  { name: '短板控制', max: 100 }
]

/**
 * 四个维度统一为「越高越好」的 0–100 分：
 * 优势 / 岗位匹配 直接来自简历 AI 分析；
 * 短板控制 = 100 − 不足，把反向指标翻正，避免「越差面积越大」；
 * 答题均分 来自每场面试已评分轮次的平均分。
 */
function buildValues() {
  const ai = latestAiScores()
  if (!ai) return null

  const list = sessionList()
  const scored = list.filter((r) => r.avg != null)
  const avg = scored.length
    ? Math.round(scored.reduce((a, r) => a + r.avg, 0) / scored.length)
    : 0

  return {
    values: [
      ai.优势,
      ai.岗位匹配,
      avg,
      Math.max(0, Math.min(100, 100 - ai.不足))
    ],
    total: list.length,
    active: activeDays(30),
    answerAvg: avg
  }
}

async function render() {
  const built = buildValues()
  if (!built) {
    hasData.value = false
    return
  }
  hasData.value = true
  total.value = built.total
  active.value = built.active
  answerAvg.value = built.answerAvg

  /* 等 v-show 生效后再量尺寸，否则拿到 0×0 */
  const chart = await ensure()
  if (!chart) return
  const t = chartTokens()

  /* 点击图形下钻到历史记录。
     off 先清空，避免切换主题重绘时重复绑定同一个回调。 */
  chart.off('click')
  chart.on('click', () => gotoItem('history'))
  const values = built.values

  chart.setOption(
    {
      tooltip: {
        backgroundColor: t.canvas,
        borderColor: t.hairline,
        borderWidth: 1,
        textStyle: { color: t.ink, fontSize: 12 },
        formatter: () =>
          `<b>当前能力</b><br/>` +
          INDICATOR.map(
            (ind, i) =>
              `${ind.name}　<span style="font-family:${MONO};font-weight:700">${values[i]}</span>`
          ).join('<br/>')
      },
      radar: {
        indicator: INDICATOR,
        radius: '82%',
        center: ['50%', '50%'],
        splitNumber: 4,
        shape: 'polygon',
        axisName: {
          color: t.body,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: MONO,
          padding: [2, 4]
        },
        splitLine: { lineStyle: { color: t.hairline } },
        splitArea: { areaStyle: { color: [t.canvas, t.canvas2] } },
        axisLine: { lineStyle: { color: t.hairline } }
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 7,
          data: [
            {
              value: values,
              name: '当前能力',
              itemStyle: { color: t.accent, borderColor: t.canvas, borderWidth: 2 },
              lineStyle: { color: t.accent, width: 2 },
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.95, [
                  { offset: 0, color: alpha(t.accentSoft, 0.68) },
                  { offset: 1, color: alpha(t.accent, 0.22) }
                ])
              },
              label: {
                show: true,
                color: t.ink,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: MONO,
                backgroundColor: t.canvas,
                borderColor: t.hairline,
                borderWidth: 1,
                borderRadius: 4,
                padding: [2, 5]
              }
            }
          ]
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
.radar {
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
