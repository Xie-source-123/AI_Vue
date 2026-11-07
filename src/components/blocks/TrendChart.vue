<template>
  <div class="card card-hero card-static trend">
    <div class="head">
      <h4 v-if="title">{{ title }}</h4>
      <span class="head-note">柱 = 场次(左轴) · 线 = 平均分(右轴)</span>
    </div>
    <div ref="chartEl" class="chart" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import { dailySessions, dailyAvgScore } from '@/utils/metrics.js'
import { chartTokens, alpha } from '@/utils/chartTheme.js'
import { useEchart } from '@/utils/echartMount.js'
import { useGotoItem } from '@/utils/gotoItem.js'
import { useTheme } from '@/theme/useTheme.js'

defineProps({ title: { type: String, default: '' } })

const chartEl = ref(null)
const { ensure } = useEchart(chartEl)
const gotoItem = useGotoItem()

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const MONO = 'JetBrains Mono, ui-monospace, monospace'

async function render() {
  const chart = await ensure()
  if (!chart) return
  const t = chartTokens()

  /* 点击图形下钻到历史记录。
     off 先清空，避免切换主题重绘时重复绑定同一个回调。 */
  chart.off('click')
  chart.on('click', () => gotoItem('history'))
  const counts = dailySessions(7)
  const avgs = dailyAvgScore(7)
  const valid = avgs.filter((v) => v != null)
  const mean = valid.length
    ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
    : null

  chart.setOption(
    {
      grid: { left: 2, right: 2, top: 36, bottom: 2, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: t.canvas,
        borderColor: t.hairline,
        borderWidth: 1,
        textStyle: { color: t.ink, fontSize: 12 }
      },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 14,
        textStyle: { color: t.muted, fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: DAYS,
        axisLine: { lineStyle: { color: t.hairline } },
        axisTick: { show: false },
        axisLabel: { color: t.muted, fontSize: 11 }
      },
      yAxis: [
        {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: t.surface2 } },
          axisLabel: { color: t.muted, fontSize: 11, fontFamily: MONO }
        },
        {
          type: 'value',
          min: 0,
          max: 100,
          splitLine: { show: false },
          axisLabel: { color: t.muted, fontSize: 11, fontFamily: MONO }
        }
      ],
      series: [
        {
          name: '面试场次',
          type: 'bar',
          data: counts,
          barWidth: 18,
          z: 1,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: t.accent },
              { offset: 1, color: alpha(t.accent, 0.28) }
            ])
          },
          emphasis: { itemStyle: { color: t.accentHover } },
          label: {
            show: true,
            position: 'top',
            color: t.muted,
            fontSize: 11,
            fontFamily: MONO
          }
        },
        {
          name: '平均分',
          type: 'line',
          yAxisIndex: 1,
          data: avgs,
          smooth: 0.35,
          connectNulls: true,
          symbol: 'circle',
          symbolSize: 8,
          z: 3,
          itemStyle: { color: t.info, borderColor: t.canvas, borderWidth: 2 },
          lineStyle: { color: t.info, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: alpha(t.info, 0.2) },
              { offset: 1, color: alpha(t.info, 0) }
            ])
          },
          markLine:
            mean == null
              ? undefined
              : {
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
                }
        }
      ]
    },
    true
  )
}

const { isDark } = useTheme()
watch(isDark, () => render())

onMounted(() => render())
</script>

<style scoped>
.trend {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  color: var(--body-muted);
  white-space: nowrap;
}
.chart {
  cursor: pointer;
  width: 100%;
  height: 300px;
}
</style>
