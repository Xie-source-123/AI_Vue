<template>
  <div class="card rec-table">
    <div class="head">
      <h4 v-if="title">{{ title }}</h4>
      <span v-if="rows.length" class="head-note">
        共 {{ rows.length }} 场 · 平均 {{ overallAvg }} 分
      </span>
    </div>

    <div v-if="!rows.length" class="empty">
      <span class="empty-mark" />
      <p>完成一次模拟面试后，这里会汇总每一场的岗位、轮次与评分。</p>
    </div>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>岗位</th>
            <th>记录名称</th>
            <th>日期</th>
            <th class="ta-c">评分轮次</th>
            <th class="th-score">平均分</th>
            <th class="ta-r">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="press-row focus-ring-inset" tabindex="0" @click="openDetail">
            <td><span class="pos-tag">{{ r.position }}</span></td>
            <td class="name-cell">{{ r.name }}</td>
            <td>
              <span class="mono">{{ fmtDate(r.date) }}</span>
              <i class="rel">{{ fmtRelative(r.date) }}</i>
            </td>
            <td class="ta-c mono">{{ r.rounds }}</td>
            <td>
              <div class="score-cell">
                <div class="score-track">
                  <div
                    class="score-fill"
                    :class="scoreBand(r.avg)"
                    :style="{ width: (r.avg || 0) + '%' }"
                  />
                </div>
                <b class="score-num" :class="scoreBand(r.avg)">
                  {{ r.avg == null ? '—' : r.avg }}
                </b>
              </div>
            </td>
            <td class="ta-r">
              <button class="row-link press-md focus-ring" @click.stop="openDetail">查看详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sessionList, fmtDate, fmtRelative, scoreBand } from '@/utils/metrics.js'
import { activeItem, pendingItem } from '@/theme/workspace.js'

defineProps({ title: { type: String, default: '' } })

const route = useRoute()
const router = useRouter()
const rows = ref([])

const overallAvg = computed(() => {
  const valid = rows.value.filter((r) => r.avg != null).map((r) => r.avg)
  if (!valid.length) return '—'
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
})

function openDetail() {
  /* 已在面试工作台：直接切到历史记录；跨工作台：登记落点后跳转 */
  if (route.name === 'InterviewWorkspace') {
    activeItem.value = 'history'
    return
  }
  pendingItem.value = 'history'
  router.push('/app/interview')
}

onMounted(() => {
  rows.value = sessionList().reverse()
})
</script>

<style scoped>
.rec-table {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.head-note {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  color: var(--body-muted);
}

/* ===== 空态 ===== */
.empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 0;
}
.empty-mark {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px dashed var(--hairline-strong, var(--hairline));
  background: var(--canvas-2);
}
.empty p {
  font-size: 12px;
  color: var(--body-muted);
  line-height: 1.7;
}

/* ===== 表格 ===== */
.table-wrap {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}
.data-table th {
  padding: 0 14px 10px;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--body-muted);
  border-bottom: 1px solid var(--hairline);
  white-space: nowrap;
}
.data-table th:first-child {
  padding-left: 12px;
}
.data-table th:last-child {
  padding-right: 12px;
}
.data-table td {
  padding: 14px;
  font-size: 13px;
  color: var(--body);
  border-bottom: 1px solid var(--hairline);
  vertical-align: middle;
}
.data-table td:first-child {
  padding-left: 12px;
}
.data-table td:last-child {
  padding-right: 12px;
}
.data-table tbody tr {
  transition: background-color var(--dur-fast) var(--ease-out);
}
.data-table tbody tr:hover {
  background: var(--canvas-2);
}
/* 行悬停时左侧滑入一条强调条，与历史记录表格行为一致 */
.data-table tbody tr:hover td:first-child {
  box-shadow: inset 3px 0 0 var(--accent);
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}

.ta-c {
  text-align: center;
}
.ta-r {
  text-align: right;
}
.th-score {
  width: 190px;
}
.mono {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--body-muted);
}
.rel {
  display: block;
  margin-top: 2px;
  font-style: normal;
  font-size: 10px;
  color: var(--body-muted);
  opacity: 0.75;
}
.name-cell {
  font-weight: 600;
  color: var(--ink);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pos-tag {
  display: inline-block;
  padding: 3px 9px;
  border-radius: var(--rad-pill);
  background: var(--accent-wash);
  color: var(--accent-hover);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

/* ===== 评分条 ===== */
.score-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.score-track {
  flex: 1;
  min-width: 64px;
  height: 8px;
  border-radius: var(--rad-pill);
  background: var(--hairline);
  overflow: hidden;
}
.score-fill {
  height: 100%;
  border-radius: var(--rad-pill);
  transition: width 0.6s var(--ease-out);
}
.score-fill.high {
  background: linear-gradient(90deg, var(--accent) 0%, var(--accent-soft) 100%);
}
.score-fill.mid {
  background: linear-gradient(90deg, var(--warn) 0%, var(--warn-soft) 100%);
}
.score-fill.low {
  background: var(--danger);
}
.score-fill.none {
  background: transparent;
}
.score-num {
  flex-shrink: 0;
  min-width: 30px;
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
.score-num.high {
  color: var(--accent-hover);
}
.score-num.mid {
  color: var(--warn);
}
.score-num.low {
  color: var(--danger);
}

.row-link {
  padding: 5px 12px;
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: var(--rad-pill);
  font-size: 12px;
  color: var(--body);
  cursor: pointer;
  white-space: nowrap;
  transition: var(--slide-trans);
}
.row-link:hover {
  border-color: var(--accent);
  color: var(--accent-hover);
  transform: translateX(2px);
}
</style>
