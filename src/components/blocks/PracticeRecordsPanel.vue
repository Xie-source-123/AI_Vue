<template>
  <section class="card prp">
    <div class="prp-head">
      <span class="tech-section">{{ mode === 'exams' ? '模拟考试记录' : '题库练习记录' }}</span>
      <div class="prp-head-right">
        <el-button
          v-if="fBank || fCategory || fDate"
          link
          type="primary"
          size="small"
          @click="clearFilters"
        >
          清空定位
        </el-button>
        <el-button link type="primary" size="small" :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <!-- 精确定位：和题库练习一样的横向点击标签 -->
    <div class="prp-filters">
      <FilterRow v-model="fBank" label="岗位" :items="bankOptions" :total="all.length" />
      <FilterRow
        v-if="mode === 'practice'"
        v-model="fCategory"
        label="知识点"
        :items="categoryOptions"
        :total="all.length"
      />
      <FilterRow v-model="fDate" label="日期" :items="dateOptions" :total="all.length" />
    </div>

    <div v-if="error" class="prp-empty">{{ error }}</div>
    <div v-else-if="loading" class="prp-empty">正在加载记录…</div>
    <div v-else-if="!rows.length" class="prp-empty">
      {{ mode === 'exams' ? '还没有模拟考试记录' : '还没有练习记录' }}
    </div>

    <!-- ============ 练习记录：一次提交 = 一张大卡 ============ -->
    <div v-else-if="mode === 'practice'" class="prp-sessions">
      <div
        v-for="s in sessions"
        :key="s.key"
        class="prp-session"
        role="button"
        tabindex="0"
        @click="openCard(s)"
        @keyup.enter="openCard(s)"
      >
        <div class="prp-session-inner">
          <div class="prp-session-top">
            <span class="prp-session-time">{{ s.atText }}</span>
            <span class="prp-session-big">{{ s.count }}<small>题</small></span>
          </div>
          <span class="prp-session-cats">{{ s.catsText }}</span>
          <p v-if="summaryOf(s)" class="prp-session-summary">{{ summaryOf(s) }}</p>
          <div class="prp-session-foot">
            <span class="prp-session-avg">平均 {{ s.avg }} 分 · {{ s.bank }}</span>
            <span class="prp-session-more">点开查看 ›</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 考试记录：按日期分组的整场记录 ============ -->
    <div v-else class="prp-groups">
      <div v-for="g in groups" :key="g.date" class="prp-group">
        <div class="prp-date">
          <span>{{ g.date }}</span>
          <span class="prp-date-meta">{{ g.rows.length }} 条</span>
        </div>
        <div v-for="e in g.rows" :key="e.id" class="prp-exam">
          <div class="prp-exam-head" @click="toggle(e.id)">
            <span class="prp-tag">{{ e.bank }}</span>
            <span class="prp-title">{{ e.card }}</span>
            <span class="prp-exam-score">{{ e.total }} / {{ e.max }}</span>
            <span class="prp-time">{{ (e.at || '').slice(11, 16) }}</span>
            <el-button link type="danger" size="small" @click.stop="remove(e)">删除</el-button>
            <span class="prp-arrow" :class="{ open: openId === e.id }">⌄</span>
          </div>
          <div v-if="openId === e.id" class="prp-exam-body">
            <span class="prp-exam-sub">
              共 {{ e.count }} 题，作答 {{ e.answered }} 题，平均
              {{ (Number(e.total) / Math.max(1, e.count)).toFixed(1) }} 分
            </span>
            <p v-if="e.summary" class="prp-exam-summary">{{ e.summary }}</p>
            <div class="prp-items">
              <span
                v-for="(it, i) in e.items || []"
                :key="i"
                class="prp-item"
                :class="{ low: Number(it.score) < 6 }"
                :title="titleOf(it.qid)"
              >
                {{ Number(it.score) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 卡片详情：题目内容 + 每次得分 ============ -->
    <el-dialog
      v-model="detailVisible"
      :title="activeCard ? `${activeCard.bank} · ${activeCard.category}` : ''"
      width="820px"
      append-to-body
    >
      <div v-if="activeCard" class="prp-detail">
        <div class="prp-detail-sum">
          {{ activeCard.atText }} · 共 <b>{{ activeCard.count }}</b> 题 · 平均
          <b>{{ activeCard.avg }}</b> 分 · {{ activeCard.bank }}
        </div>
        <div v-for="(q, i) in activeCard.items" :key="q.qid" class="prp-detail-item">
          <div class="prp-detail-head">
            <span class="prp-no">{{ i + 1 }}</span>
            <span class="prp-tag light">{{ q.category }}</span>
            <span class="prp-detail-score" :class="{ low: q.score < 6 }">{{ q.score }} 分</span>
          </div>
          <p class="prp-detail-q">{{ q.title || '（题库中已找不到这道题，可能被删除了）' }}</p>
          <p class="prp-detail-a my">
            <span class="prp-lbl">我的回答</span>{{ q.myAnswer || '（这条记录没有保存作答内容）' }}
          </p>
          <p v-if="q.refAnswer" class="prp-detail-a ref">
            <span class="prp-lbl">参考答案</span>{{ q.refAnswer }}
          </p>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FilterRow from './FilterRow.vue'
import {
  fetchPracticeRecordsAPI,
  fetchBanksAPI,
  fetchBankAPI,
  deleteExamRecordAPI
} from '@/api/index.js'

const props = defineProps({
  mode: { type: String, default: 'practice' } // practice | exams
})

const loading = ref(false)
const error = ref('')
const practice = ref([])
const exams = ref([])
const summaries = ref([])

/* 交卷点评：练习按批次时间戳（ref）关联，考试直接挂在考试记录上 */
const summaryByRef = computed(() => {
  const m = new Map()
  summaries.value.forEach((s) => {
    if (s.ref) m.set(s.ref, s.summary)
  })
  return m
})

function summaryOf(session) {
  return session.summary || ''
}
const fBank = ref('')
const fCategory = ref('')
const fDate = ref('')
const openId = ref('')

/* 题目 id -> { title, answer }：记录里只存 qid，要点开看题目内容就得回题库查 */
const questionMap = ref(new Map())

const detailVisible = ref(false)
const activeCard = ref(null)

const all = computed(() => (props.mode === 'exams' ? exams.value : practice.value))
const banks = computed(() => [...new Set(all.value.map((r) => r.bank).filter(Boolean))])

/* 知识点定位：只列「有作答记录」的知识点，没练过的不出现 */
const categories = computed(() =>
  [...new Set(all.value.map((r) => r.category).filter(Boolean))].sort()
)

const dates = computed(() =>
  [...new Set(all.value.map((r) => String(r.at || '').slice(0, 10)).filter(Boolean))].sort().reverse()
)

/* 定位标签：选项来自「另外两个条件已生效」的记录，计数才有意义 */
function optionsFrom(pick, keep) {
  const m = new Map()
  all.value.filter(keep).forEach((r) => {
    const v = pick(r)
    if (v) m.set(v, (m.get(v) || 0) + 1)
  })
  return [...m.entries()].map(([value, count]) => ({ value, label: value, count }))
}

const bankOptions = computed(() =>
  optionsFrom(
    (r) => r.bank,
    (r) =>
      (!fCategory.value || r.category === fCategory.value) &&
      (!fDate.value || String(r.at || '').startsWith(fDate.value))
  )
)

/* 知识点只列「有作答记录」的，没练过的不会出现 */
const categoryOptions = computed(() =>
  optionsFrom(
    (r) => r.category,
    (r) =>
      (!fBank.value || r.bank === fBank.value) &&
      (!fDate.value || String(r.at || '').startsWith(fDate.value))
  ).sort((a, b) => (a.label < b.label ? -1 : 1))
)

const dateOptions = computed(() =>
  optionsFrom(
    (r) => String(r.at || '').slice(0, 10),
    (r) =>
      (!fBank.value || r.bank === fBank.value) &&
      (!fCategory.value || r.category === fCategory.value)
  ).sort((a, b) => (a.label < b.label ? 1 : -1))
)

function clearFilters() {
  fBank.value = ''
  fCategory.value = ''
  fDate.value = ''
}

const rows = computed(() =>
  all.value.filter(
    (r) =>
      (!fBank.value || r.bank === fBank.value) &&
      (!fCategory.value || r.category === fCategory.value) &&
      (!fDate.value || String(r.at || '').startsWith(fDate.value))
  )
)

function titleOf(qid) {
  return questionMap.value.get(String(qid))?.title || String(qid)
}

/**
 * 练习记录按「日期 + 知识点」聚合成大卡片。
 * 同一天、同一知识点的所有作答（可能跨多次提交）合并成一张卡，
 * 这样卡片数量可控，也能看出「这个知识点今天练了多少」。
 */
const sessions = computed(() => {
  const m = new Map()
  rows.value.forEach((r) => {
    const day = String(r.at || '').slice(0, 10) || '未知日期'
    const cat = r.category || '未分类'
    const key = `${day}||${cat}`
    if (!m.has(key)) {
      m.set(key, { key, day, category: cat, bank: r.bank || '', ats: [], raws: [] })
    }
    const g = m.get(key)
    g.ats.push(String(r.at || ''))
    g.raws.push(r)
  })

  return [...m.values()]
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .map((s) => {
      const items = s.raws
        .map((r) => {
          const qid = String(r.qid || '')
          return {
            qid,
            score: Number(r.score) || 0,
            category: r.category || '未分类',
            title: questionMap.value.get(qid)?.title || '',
            // 我的回答来自记录本身；参考答案回题库查（记录里不存）
            myAnswer: String(r.answer || ''),
            refAnswer: questionMap.value.get(qid)?.answer || ''
          }
        })
        .sort((a, b) => b.score - a.score)
      const sum = items.reduce((a, q) => a + q.score, 0)
      const ats = [...new Set(s.ats)].sort()
      // 同一张卡里可能有多条批次点评，取最新的一条
      const summary = ats.map((a) => summaryByRef.value.get(a)).filter(Boolean).pop() || ''
      return {
        key: s.key,
        bank: s.bank,
        category: s.category,
        day: s.day,
        atText: s.day,
        at: ats[ats.length - 1] || '',
        summary,
        count: items.length,
        avg: items.length ? (sum / items.length).toFixed(1) : '0.0',
        catsText: s.category,
        items
      }
    })
})

const groups = computed(() => {
  const m = new Map()
  rows.value.forEach((r) => {
    const d = String(r.at || '').slice(0, 10) || '未知日期'
    if (!m.has(d)) m.set(d, [])
    m.get(d).push(r)
  })
  return [...m.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({
      date,
      rows: list.slice().sort((a, b) => String(b.at).localeCompare(String(a.at)))
    }))
})

async function loadQuestions() {
  try {
    const { data } = await fetchBanksAPI()
    const bankList = data.banks || []
    const map = new Map()
    for (const b of bankList) {
      try {
        const r = await fetchBankAPI(b.id)
        ;(r.data.questions || []).forEach((q) => {
          map.set(String(q.id), { title: q.title || '', answer: q.answer || '' })
        })
      } catch {
        /* 单个题库取不到就跳过，详情里会显示占位文案 */
      }
    }
    questionMap.value = map
  } catch {
    /* 忽略：题目内容拿不到不影响卡片聚合本身 */
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await fetchPracticeRecordsAPI()
    practice.value = data.practice || []
    exams.value = data.exam || []
    summaries.value = data.summaries || []
    if (props.mode === 'practice' && !questionMap.value.size) await loadQuestions()
  } catch (e) {
    error.value = '记录加载失败：' + (e.response?.data?.detail || e.message)
  } finally {
    loading.value = false
  }
}

function openCard(c) {
  activeCard.value = c
  detailVisible.value = true
}

function toggle(id) {
  openId.value = openId.value === id ? '' : id
}

async function remove(e) {
  try {
    await ElMessageBox.confirm('删除这次考试记录？不可撤销。', '删除记录', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteExamRecordAPI(e.id)
    ElMessage.success('已删除')
    await load()
  } catch (err) {
    ElMessage.error(err.response?.data?.detail || '删除失败')
  }
}

onMounted(load)
</script>

<style scoped>
.prp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
/* 定位条：和题库练习同一套横向标签 */
.prp-filters {
  margin-bottom: 14px;
  padding: 4px 14px;
  border-radius: var(--rad-block);
  background: var(--canvas-2);
}
.prp-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.prp-empty {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--body-muted);
}

/* ===== 练习：一次提交 = 一张大卡 ===== */
.prp-sessions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}
.prp-session {
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: var(--card-grad);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.prp-session:hover {
  border-color: var(--accent-line);
  transform: translateY(-2px);
}
.prp-session-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
}
.prp-session-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.prp-session-time {
  font-size: 15px;
  font-weight: 650;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.prp-session-big {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.prp-session-big small {
  font-size: 12px;
  margin-left: 2px;
  color: var(--body-muted);
}
.prp-session-cats {
  font-size: 12px;
  line-height: 1.7;
  color: var(--body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prp-session-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed var(--hairline);
}
.prp-session-avg {
  font-size: 11.5px;
  color: var(--body-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prp-session-more {
  font-size: 11.5px;
  color: var(--accent);
  white-space: nowrap;
}
/* 交卷点评 */
.prp-session-summary,
.prp-exam-summary {
  margin: 0;
  padding: 7px 10px;
  border-radius: 7px;
  border-left: 2px solid var(--accent-line);
  background: var(--accent-wash);
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--body);
}
.prp-exam-summary {
  margin-top: 8px;
}

/* ===== 考试：按日期分组 ===== */
.prp-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 6px;
}
.prp-date {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--body-muted);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 8px;
}
.prp-date-meta {
  font-weight: 400;
  font-size: 11.5px;
}
.prp-exam-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  font-size: 12.5px;
  color: var(--body);
  cursor: pointer;
}
.prp-tag {
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 11px;
  background: var(--accent-wash-2);
  color: var(--accent);
  white-space: nowrap;
}
.prp-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prp-exam-score {
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.prp-time {
  font-size: 11.5px;
  color: var(--body-muted);
  font-variant-numeric: tabular-nums;
}
.prp-arrow {
  font-size: 12px;
  color: var(--body-muted);
  transition: transform var(--dur-fast) var(--ease-out);
}
.prp-arrow.open {
  transform: rotate(180deg);
}
.prp-exam-body {
  padding: 4px 0 10px 10px;
}
.prp-exam-sub {
  font-size: 11.5px;
  color: var(--body-muted);
}
.prp-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.prp-item {
  min-width: 24px;
  text-align: center;
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  background: var(--accent-wash-2);
  color: var(--accent);
}
.prp-item.low {
  background: var(--danger-wash);
  color: var(--danger);
}

/* ===== 详情弹窗 ===== */
.prp-detail {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 6px;
}
.prp-detail-sum {
  padding: 10px 14px;
  margin-bottom: 14px;
  border-radius: var(--rad-block);
  background: var(--accent-wash);
  border: 1px solid var(--accent-line);
  font-size: 12.5px;
  color: var(--body);
}
.prp-detail-sum b {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.prp-detail-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--hairline);
}
.prp-detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.prp-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent-ink);
  background: var(--accent);
}
.prp-detail-score {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.prp-detail-score.low {
  color: var(--danger);
}
.prp-detail-q {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink);
}
.prp-detail-a {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.9;
  color: var(--body);
  white-space: pre-wrap;
}
/* 我的回答 / 参考答案用左竖条区分：一眼能看出哪段是自己写的 */
.prp-detail-a.my {
  padding-left: 10px;
  border-left: 2px solid var(--accent-line);
}
.prp-detail-a.ref {
  padding-left: 10px;
  border-left: 2px solid var(--hairline);
}
.prp-lbl {
  display: inline-block;
  margin-right: 6px;
  font-weight: 600;
  color: var(--body-muted);
}
</style>
