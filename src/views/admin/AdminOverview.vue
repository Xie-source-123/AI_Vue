<template>
  <div class="a-page">
    <!-- ===== KPI ===== -->
    <div class="a-stat-grid">
      <div v-for="s in stats" :key="s.label" class="a-stat">
        <span class="a-stat-label">
          <el-icon :size="14"><component :is="s.icon" /></el-icon>
          {{ s.label }}
        </span>
        <div class="a-stat-value">
          {{ s.value }}<small v-if="s.unit">{{ s.unit }}</small>
        </div>
        <div class="a-stat-note">{{ s.note }}</div>
      </div>
    </div>

    <!-- ===== 趋势 ===== -->
    <div class="a-chart-grid">
      <div class="a-card">
        <div class="a-card-head">
          <div>
            <div class="a-card-title">注册趋势</div>
            <div class="a-card-sub">近 14 天新增账号</div>
          </div>
        </div>
        <div ref="regEl" class="a-chart" />
      </div>

      <div class="a-card">
        <div class="a-card-head">
          <div>
            <div class="a-card-title">评分趋势</div>
            <div class="a-card-sub">近 14 天各场平均分</div>
          </div>
        </div>
        <div ref="scoreEl" class="a-chart" />
      </div>
    </div>

    <!-- ===== 岗位分布 ===== -->
    <div class="a-card">
      <div class="a-card-head">
        <div>
          <div class="a-card-title">岗位热度</div>
          <div class="a-card-sub">按已上报的面试记录统计</div>
        </div>
      </div>
      <el-table v-if="positions.length" :data="positions" size="small">
        <el-table-column type="index" label="#" width="52" />
        <el-table-column prop="position" label="岗位" />
        <el-table-column prop="count" label="面试场次" width="120" align="right" />
      </el-table>
      <p v-else class="a-empty">
        还没有上报的面试记录<br />
        用户在面试工作台点「提交面试并保存」后会自动同步到这里
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { User, ChatLineSquare, Star, Collection } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { fetchOverviewAPI, adminErrorText } from '@/api/admin.js'
import { useEchart } from '@/utils/echartMount.js'
import { chartTokens } from '@/utils/chartTheme.js'
import { useTheme } from '@/theme/useTheme.js'

const data = ref(null)
const { isDark } = useTheme()

const regEl = ref(null)
const scoreEl = ref(null)
const { ensure: ensureReg } = useEchart(regEl)
const { ensure: ensureScore } = useEchart(scoreEl)

const stats = computed(() => {
  const d = data.value
  if (!d) return []
  return [
    {
      label: '注册账号',
      icon: User,
      value: d.users.total,
      note: `管理员 ${d.users.admins} · 已禁用 ${d.users.disabled}`
    },
    {
      label: '近 7 天新增',
      icon: User,
      value: d.users.new_7d,
      unit: ' 个',
      note: '按注册时间统计'
    },
    {
      label: '面试场次',
      icon: ChatLineSquare,
      value: d.records.total,
      note: `${d.records.users} 位用户 · 共 ${d.records.rounds} 轮`
    },
    {
      label: '平均分',
      icon: Star,
      value: d.records.avg_score || '—',
      unit: d.records.avg_score ? ' 分' : '',
      note: `基于 ${d.records.scored_rounds} 个已评分轮次`
    },
    {
      label: '题库题目',
      icon: Collection,
      value: d.questions.total,
      note: `${d.questions.terms} 个术语已并入语音热词`
    }
  ]
})

/* 岗位热度表的数据。
   注意这是个 computed，不是 ref —— 模板里直接用了 positions，
   之前漏了这一步声明，渲染期取 positions.length 会抛
   "Cannot read properties of undefined"，组件整个崩掉、页面白屏。 */
const positions = computed(() => data.value?.positions?.used || [])

/* 两张图的「空数据」表达不一样：
   注册趋势没有数据时画一条 0 线就是有意义的（确实没人注册）；
   评分趋势没有数据时画 0 线会误导成「大家都考了 0 分」，
   所以那种情况直接显示提示文字。 */
async function renderCharts() {
  const d = data.value
  if (!d) return
  const t = chartTokens()

  const reg = await ensureReg()
  if (reg) {
    reg.setOption(
      {
        grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
        tooltip: { trigger: 'axis', backgroundColor: t.canvas, borderColor: t.hairline, textStyle: { color: t.ink, fontSize: 12 } },
        xAxis: {
          type: 'category',
          data: d.register_trend.map((x) => x.date.slice(5)),
          axisLine: { lineStyle: { color: t.hairline } },
          axisLabel: { color: t.body, fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: t.surface2 } },
          axisLabel: { color: t.body, fontSize: 10 }
        },
        series: [
          {
            type: 'bar',
            data: d.register_trend.map((x) => x.count),
            itemStyle: { color: t.accent, borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 18
          }
        ]
      },
      true
    )
    reg.resize()
  }

  const score = await ensureScore()
  if (score) {
    const pts = d.score_trend.filter((x) => x.count > 0)
    score.setOption(
      {
        grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
        tooltip: { trigger: 'axis', backgroundColor: t.canvas, borderColor: t.hairline, textStyle: { color: t.ink, fontSize: 12 } },
        xAxis: {
          type: 'category',
          data: pts.map((x) => x.date.slice(5)),
          axisLine: { lineStyle: { color: t.hairline } },
          axisLabel: { color: t.body, fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          max: 100,
          splitLine: { lineStyle: { color: t.surface2 } },
          axisLabel: { color: t.body, fontSize: 10 }
        },
        series: [
          {
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 7,
            data: pts.map((x) => x.avg),
            itemStyle: { color: t.accent, borderColor: t.canvas, borderWidth: 2 },
            lineStyle: { color: t.accent, width: 2 },
            areaStyle: { color: t.accentWash || 'transparent' }
          }
        ]
      },
      true
    )
    score.resize()
  }
}

async function load() {
  try {
    const { data: d } = await fetchOverviewAPI()
    data.value = d
    renderCharts()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '加载总览数据失败'))
  }
}

watch(isDark, () => renderCharts())
onMounted(load)
</script>
