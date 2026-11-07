<template>
  <div class="card card-hero card-static score-line">
    <div class="head">
      <h4 v-if="title">{{ title }}</h4>
      <span v-if="count" class="head-note">共 {{ count }} 场</span>
    </div>
    <div v-show="hasData" ref="el" class="chart" />

    <div v-if="hasData" class="caption">
      <span class="cap-item"><b>{{ peak }}</b> 最高分</span>
      <span class="cap-sep" />
      <span class="cap-item"><b>{{ low }}</b> 最低分</span>
      <span class="cap-sep" />
      <span class="cap-item"><b>{{ meanScore }}</b> 均分</span>
    </div>

    <p v-if="!hasData" class="empty">面试记录里还没有评分数据</p>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import { sessionList } from '@/utils/metrics.js'
import { chartTokens, alpha } from '@/utils/chartTheme.js'
import { useEchart } from '@/utils/echartMount.js'
import { useGotoItem } from '@/utils/gotoItem.js'
import { useTheme } from '@/theme/useTheme.js'

defineProps({ title: { type: String, default: '' } })

const el = ref(null)
const { ensure } = useEchart(el)
const gotoItem = useGotoItem()
const hasData = ref(false)
const count = ref(0)
const peak = ref(0)
const low = ref(0)
const meanScore = ref(0)
const MONO = 'JetBrains Mono, ui-monospace, monospace'

function buildSeries() {
  return sessionList().filter((r) => r.avg != null)
}

async function render() {
  const list = buildSeries()
  count.value = list.length
  if (!list.length) {
    hasData.value = false
    return
  }
  hasData.value = true

  /* 等 v-show 生效后再量尺寸，否则拿到 0×0 */
  const chart = await ensure()
  if (!chart) return
  const t = chartTokens()

  /* 点击图形下钻到历史记录。
     off 先清空，避免切换主题重绘时重复绑定同一个回调。 */
  chart.off('click')
  chart.on('click', () => gotoItem('history'))

  const scores = list.map((r) => r.avg)
  const mean = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  peak.value = Math.max(...scores)
  low.value = Math.min(...scores)
  meanScore.value = mean

  chart.setOption(
    {
      grid: { left: 2, right: 14, top: 34, bottom: 2, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: t.canvas,
        borderColor: t.hairline,
        borderWidth: 1,
        textStyle: { color: t.ink, fontSize: 12 }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: list.map((_, i) => `第 ${i + 1} 场`),
        axisLine: { lineStyle: { color: t.hairline } },
        axisTick: { show: false },
        axisLabel: { color: t.muted, fontSize: 11, fontFamily: MONO }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: t.surface2 } },
        axisLabel: { color: t.muted, fontSize: 11, fontFamily: MONO }
      },
      series: [
        {
          type: 'line',
          smooth: 0.35,
          symbol: 'circle',
          symbolSize: 8,
          data: list.map((r) => r.avg),          itemStyle: { color: t.accent, borderColor: t.canvas, borderWidth: 2 },
          lineStyle: { color: t.accent, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: alpha(t.accentSoft, 0.6) },
              { offset: 1, color: alpha(t.accentSoft, 0.02) }
            ])
          },
          label: {
            show: true,
            position: 'top',
            color: t.muted,
            fontSize: 11,
            fontFamily: MONO
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 34,
            itemStyle: { color: t.accentHover },
            label: { color: t.accentInk, fontSize: 10, fontFamily: MONO },
            data: [{ type: 'max', name: '最高分' }]
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              {
                yAxis: mean,
                label: {
                  formatter: `均分 ${mean}`,
                  color: t.muted,
                  fontSize: 10,
                  fontFamily: MONO,
                  position: 'insideEndTop'
                },
                lineStyle: { color: t.hairline, type: 'dashed', width: 1 }
              }
            ]
          },
          emphasis: { focus: 'series' },
          z: 3
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
.score-line {
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
