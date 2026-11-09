<template>
  <section class="card qbp">
    <!-- 未作答时显示题库列表；进入答题后整块被答题页替换（不再用弹窗） -->
    <template v-if="!answering">
    <!-- ===== 顶部：分组方式 + 题库横向标签（不再用下拉）===== -->
    <div class="qbp-head">
      <span class="tech-section">{{ mode === 'exam' ? '模拟考试' : '题库练习' }}</span>
      <div class="qbp-head-right">
        <!-- 只有模拟考试提供分组方式；练习固定「一个知识点一张卡」 -->
        <el-radio-group v-if="mode === 'exam'" v-model="groupMode" size="small">
          <el-radio-button value="random">乱序分组</el-radio-button>
          <el-radio-button value="category">按知识点</el-radio-button>
        </el-radio-group>
        <span class="qbp-head-hint">
          {{ mode === 'exam' ? '每张卡 20 题' : '一个知识点一张卡 · 不限题数' }}
        </span>
      </div>
    </div>

    <div v-if="error" class="qbp-empty">{{ error }}</div>
    <div v-else-if="loading" class="qbp-empty">正在加载题库…</div>
    <div v-else-if="!questions.length" class="qbp-empty">
      还没有可用的题库 —— 需要管理员先在后台「题库管理」里上传 Excel。
    </div>

    <template v-else>
      <!-- ===== 三组横向分类 ===== -->
      <div class="qbp-filters">
        <FilterRow v-model="filters.position" label="岗位" :items="positionOptions" :total="questions.length" />
        <FilterRow v-model="filters.category" label="知识点" :items="categoryOptions" :total="questions.length" />
        <FilterRow v-model="filters.difficulty" label="难度" :items="difficultyOptions" :total="questions.length" />
      </div>

      <div class="qbp-stat">
        筛选出 <b>{{ filtered.length }}</b> 题 · 分成 <b>{{ cards.length }}</b> 组
        <span class="qbp-tip">每组最多 20 题，点卡片进入作答</span>
        <button v-if="hasActiveFilter" class="qbp-reset" @click="clearFilters">清空筛选</button>
      </div>

      <!-- 实时数据条：练习与考试的当前情况（数据来自本组件已加载的记录，不额外请求） -->
      <div class="qbp-live">
        <span class="qbp-live-item">
          总进度 <b>{{ liveStat.percent }}%</b>
        </span>
        <span class="qbp-live-item">
          答对 <b>{{ liveStat.correct }}</b> / {{ liveStat.total }} 题
        </span>
        <span class="qbp-live-item">
          已练 <b>{{ liveStat.touched }}</b> 个知识点
        </span>
        <span class="qbp-live-item">
          模拟考试 <b>{{ records.exam.length }}</b> 次
        </span>
        <span class="qbp-live-item muted">实时</span>
      </div>

      <!-- 组合为空时给提示：难度和知识点在你的题库里是强关联的，
           随手组合很容易一个都命中不了 -->
      <div v-if="!filtered.length" class="qbp-empty">
        当前筛选组合下没有题目 —— 换个难度或知识点，或者
        <button class="qbp-reset" @click="clearFilters">清空筛选</button>
      </div>

      <!-- ===== 按知识点分组的卡片：外围进度环 + 卡片内百分比 ===== -->
      <div class="qbp-cards">
        <div
          v-for="c in cards"
          :key="c.key"
          class="qbp-card"
          :style="{ '--p': progressOf(c).percent }"
          role="button"
          tabindex="0"
          @click="openCard(c)"
          @keyup.enter="openCard(c)"
        >
          <div class="qbp-card-inner">
            <span class="qbp-card-name">{{ c.name }}</span>
            <span class="qbp-card-meta">
              {{ c.questions.length }} 题
              <template v-if="mode === 'exam' && examCountOf(c)">
                · 已模考 {{ examCountOf(c) }} 次
              </template>
            </span>
            <div class="qbp-card-progress">
              <span class="qbp-card-pct">{{ progressOf(c).percent }}%</span>
              <span class="qbp-card-sub">
                答对 {{ progressOf(c).correct }} / {{ progressOf(c).total }} 题
              </span>
            </div>
            <div class="qbp-card-foot">
              <span class="qbp-card-last">{{ lastOf(c) }}</span>
              <button
                v-if="progressOf(c).answered"
                class="qbp-card-clear"
                @click.stop="clearCard(c)"
              >
                清空
              </button>
            </div>
          </div>
        </div>

        <!-- 自定义模拟试卷：入口放在所有卡片最后，样式与卡片一致 -->
        <div
          v-if="mode === 'exam'"
          class="qbp-card qbp-card-custom"
          role="button"
          tabindex="0"
          @click="openCustom"
          @keyup.enter="openCustom"
        >
          <div class="qbp-card-inner">
            <span class="qbp-card-name">＋ 自定义模拟试卷</span>
            <span class="qbp-card-meta">自选难度 / 题数 / 知识点占比</span>
            <div class="qbp-card-progress">
              <span class="qbp-card-pct">DIY</span>
              <span class="qbp-card-sub">按你的比例抽题</span>
            </div>
            <div class="qbp-card-foot">
              <span class="qbp-card-last">点这里开始配置</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 自定义模拟试卷 ===== -->
    <el-dialog v-model="customVisible" title="自定义模拟试卷" width="580px" append-to-body>
      <el-form label-position="top">
        <div class="cq-grid">
          <el-form-item label="题数">
            <el-input-number v-model="customForm.count" :min="1" :max="100" style="width: 100%" />
          </el-form-item>
          <el-form-item label="难度（不选 = 全部）">
            <el-select
              v-model="customForm.difficulties"
              multiple
              collapse-tags
              placeholder="全部难度"
              style="width: 100%"
            >
              <el-option v-for="d in DIFF_LIST" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="涉及知识点（不选 = 全部）">
          <el-select
            v-model="customForm.categories"
            multiple
            collapse-tags
            placeholder="全部知识点"
            style="width: 100%"
          >
            <el-option v-for="c in categoryPool" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="customForm.categories.length" label="知识点占比（按比例分配题数）">
          <div class="cq-ratios">
            <div v-for="c in customForm.categories" :key="c" class="cq-ratio-row">
              <span class="cq-ratio-name">{{ c }}</span>
              <el-input-number
                v-model="customForm.ratios[c]"
                :min="0"
                :max="100"
                size="small"
                style="width: 118px"
              />
              <span class="cq-ratio-unit">%</span>
              <span class="cq-ratio-num">≈ {{ planCount(c) }} 题</span>
            </div>
          </div>
        </el-form-item>

        <p class="cq-tip">
          当前条件下可用 <b>{{ customPool.length }}</b> 道题。占比会按比例换算成题数，
          除不尽的部分补给占比最高的一项，保证总题数正好等于你填的数。
        </p>
      </el-form>
      <template #footer>
        <el-button @click="customVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!customPool.length" @click="generateCustom">
          生成试卷
        </el-button>
      </template>
    </el-dialog>

    </template>

    <!-- ===== 答题页（页内排版，非弹窗） ===== -->
    <template v-else>
      <header class="qp-bar">
        <button class="qp-exit" @click="closeAnswering">‹ 退出答题</button>
        <span class="qp-title">{{ activeCard?.bank }} · {{ activeCard?.name }}</span>
        <div class="qp-bar-right">
          <span class="qp-timer">⏱ {{ elapsedText }}</span>
          <el-button
            v-if="phase !== 'graded'"
            type="primary"
            size="small"
            :loading="grading"
            @click="submitAll"
          >
            {{ mode === 'exam' ? '交卷' : '整组评分' }}
          </el-button>
          <span v-else class="qp-done-tip">已交卷</span>
        </div>
      </header>

      <div v-if="phase === 'graded'" class="qp-total">
        总分 <b>{{ total }}</b> / {{ max }}（{{ activeCard?.questions.length }} 题，平均
        {{ (total / Math.max(1, activeCard?.questions.length || 1)).toFixed(1) }} 分）
      </div>

      <div class="qp-page">
        <div
          v-for="(q, i) in activeCard?.questions || []"
          :key="q.id"
          :ref="(el) => setItemEl(el, i)"
          class="qp-card"
        >
          <div class="qp-card-head">
            <span class="qp-tag">{{ diffLabel(q.difficulty) }}</span>
            <span v-if="q.category" class="qp-tag light">{{ q.category }}</span>
            <span class="qp-card-idx">{{ i + 1 }}</span>
            <span v-if="scores[i] != null" class="qp-badge" :class="{ low: scores[i] < 6 }">
              {{ scores[i] }} 分
            </span>
          </div>

          <p class="qp-q">{{ q.title }}</p>

          <!-- 客观题（单选 / 多选 / 判断）：选项直接点选，本地判分 -->
          <div v-if="isChoice(q)" class="qp-opts">
            <button
              v-for="o in q.options"
              :key="o.key"
              class="qp-opt"
              :class="{
                active: chosen(i, o.key),
                right: reveal(i) && rightKey(q, o.key),
                wrong: reveal(i) && chosen(i, o.key) && !rightKey(q, o.key)
              }"
              :disabled="phase === 'graded' || scores[i] != null"
              @click="pick(i, o.key)"
            >
              <span class="qp-opt-key">{{ o.key }}</span>
              <span class="qp-opt-text">{{ o.text }}</span>
            </button>
            <span v-if="q.type === '多选题'" class="qp-opt-hint">多选题，可多选</span>
          </div>

          <!-- 主观题：文本框作答，交 AI 评分 -->
          <el-input
            v-else
            v-model="answers[i]"
            type="textarea"
            :rows="4"
            placeholder="写下你的回答"
            :disabled="phase === 'graded' || scoringOne === i"
          />

          <div v-if="mode === 'practice' && phase !== 'graded'" class="qp-actions">
            <el-button
              size="small"
              type="primary"
              plain
              :loading="scoringOne === i"
              :disabled="scores[i] != null"
              @click="scoreOne(i)"
            >
              {{ isChoice(q) ? '确认答案' : '提交评分' }}
            </el-button>
            <el-button v-if="scores[i] != null" size="small" text @click="redoOne(i)">重答</el-button>
          </div>

          <p v-if="comments[i]" class="qp-comment">{{ comments[i] }}</p>
          <p v-if="q.explain && reveal(i)" class="qp-ref">
            <span class="qp-lbl">解析</span>{{ q.explain }}
          </p>
          <p v-if="!isChoice(q) && (scores[i] != null || phase === 'graded')" class="qp-ref">
            <span class="qp-lbl">参考答案</span>{{ q.answer || '（题库未提供）' }}
          </p>
        </div>
      </div>

      <!-- 左下答题卡：点数字跳到对应题目 -->
      <div class="qp-sheet" :class="{ open: sheetOpen }">
        <button class="qp-sheet-head" @click="sheetOpen = !sheetOpen">
          答题卡
          <span class="qp-sheet-count">{{ answeredCount }} / {{ activeCard?.questions.length || 0 }}</span>
          <span class="qp-caret" :class="{ up: sheetOpen }">⌄</span>
        </button>
        <div v-if="sheetOpen" class="qp-sheet-body">
          <button
            v-for="(q, i) in activeCard?.questions || []"
            :key="q.id"
            class="qp-dot"
            :class="{ done: (answers[i] || '').trim(), scored: scores[i] != null }"
            @click="jumpTo(i)"
          >
            {{ i + 1 }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  fetchBanksAPI,
  fetchBankAPI,
  scorePracticeAPI,
  fetchPracticeRecordsAPI,
  savePracticeRecordsAPI,
  saveExamRecordAPI,
  clearPracticeRecordsAPI
} from '@/api/index.js'
import FilterRow from './FilterRow.vue'

const props = defineProps({
  mode: { type: String, default: 'practice' } // practice | exam
})

const GROUP_SIZE = 20
/* Excel 里是「基础/进阶/真题」，界面上要显示成「简单/适中/难」。
   只做显示映射，存储值不动 —— 换回去还能对上原始表格。 */
const DIFF_MAP = { 基础: '简单', 进阶: '适中', 真题: '难' }
const DIFF_LIST = ['简单', '适中', '难']
const diffLabel = (d) => DIFF_MAP[d] || d || '简单'

const banks = ref([])
const questions = ref([])
const loading = ref(false)
const error = ref('')
const filters = reactive({ position: '', category: '', difficulty: '' })

/* 答题页状态（原来是 el-dialog 的 dialogVisible，现在改成页内切换） */
const answering = ref(false)
const sheetOpen = ref(false)
const elapsed = ref(0)
const activeCard = ref(null)
const answers = ref([])
const scores = ref([])
const comments = ref([])
const phase = ref('answering')
const total = ref(0)
const max = ref(0)
const grading = ref(false)
const scoringOne = ref(-1)

const filtered = computed(() => {
  let arr = questions.value
  if (filters.position) arr = arr.filter((q) => q._bank === filters.position)
  if (filters.category) arr = arr.filter((q) => (q.category || '未分类') === filters.category)
  if (filters.difficulty) arr = arr.filter((q) => diffLabel(q.difficulty) === filters.difficulty)
  return arr
})

function countBy(fn) {
  const m = new Map()
  filtered.value.forEach((q) => {
    const k = fn(q)
    m.set(k, (m.get(k) || 0) + 1)
  })
  return m
}

/* 岗位分类 = 题库名称。
   现在每个题库代表一个岗位（题库按岗位命名），所以「选岗位」就是「选题库」；
   以后加了新题库，这一行会自动多出一个标签，不用改代码。 */
const allBankNames = computed(() => [
  ...new Set(questions.value.map((q) => q._bank || '').filter(Boolean))
])
const allCategoryNames = computed(() => [
  ...new Set(questions.value.map((q) => q.category || '未分类'))
])

const positionOptions = computed(() =>
  allBankNames.value.map((n) => ({
    value: n,
    label: n,
    count: questions.value.filter(
      (q) =>
        (q._bank || '') === n &&
        (!filters.category || (q.category || '未分类') === filters.category) &&
        (!filters.difficulty || diffLabel(q.difficulty) === filters.difficulty)
    ).length
  }))
)

const categoryOptions = computed(() =>
  allCategoryNames.value.map((c) => ({
    value: c,
    label: c,
    count: questions.value.filter(
      (q) =>
        (q.category || '未分类') === c &&
        (!filters.position || q._bank === filters.position) &&
        (!filters.difficulty || diffLabel(q.difficulty) === filters.difficulty)
    ).length
  }))
)

/* 难度固定显示三项（哪怕某项当前是 0 题），避免标签忽隐忽现 */
const difficultyOptions = computed(() =>
  DIFF_LIST.map((d) => ({
    value: d,
    label: d,
    count: questions.value.filter(
      (q) =>
        diffLabel(q.difficulty) === d &&
        (!filters.position || q._bank === filters.position) &&
        (!filters.category || (q.category || '未分类') === filters.category)
    ).length
  }))
)

const hasActiveFilter = computed(
  () => !!(filters.position || filters.category || filters.difficulty)
)

function clearFilters() {
  filters.position = ''
  filters.category = ''
  filters.difficulty = ''
}

/* 换题库后，原先选中的知识点/岗位可能已不存在 —— 自动清掉，
   否则会留下「筛选条件还在、标签却找不到」的僵尸状态。 */
watch(allCategoryNames, (list) => {
  if (filters.category && !list.includes(filters.category)) filters.category = ''
})
watch(allBankNames, (list) => {
  if (filters.position && !list.includes(filters.position)) filters.position = ''
})

function shuffle(arr) {
  const c = arr.slice()
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[c[i], c[j]] = [c[j], c[i]]
  }
  return c
}

/** 主知识点：这一组里出现最多的分类 */
function dominantCategory(list) {
  const m = new Map()
  list.forEach((q) => {
    const k = q.category || '未分类'
    m.set(k, (m.get(k) || 0) + 1)
  })
  let best = '综合'
  let n = -1
  for (const [k, v] of m) {
    if (v > n) {
      n = v
      best = k
    }
  }
  return best
}

/* 只用于【模拟考试】的分组方式切换；练习页固定按知识点 */
const groupMode = ref('random')

/** 会话内稳定的乱序：同一份题池每次算出来都一样，
 *  否则每次筛选/评分重算都会重新打乱，「模拟题1」里装哪 20 题飘忽不定。 */
function seedFrom(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededShuffle(arr, seed) {
  let s = seed
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const c = arr.slice()
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[c[i], c[j]] = [c[j], c[i]]
  }
  return c
}

const cards = computed(() => {
  const src = filtered.value
  if (!src.length) return []

  /* 练习：一个知识点一张卡，装下该知识点的【全部】题目，不切 20 题 */
  if (props.mode === 'practice') {
    const byCat = new Map()
    src.forEach((q) => {
      const k = `${q._bank || ''}||${q.category || '未分类'}`
      if (!byCat.has(k)) byCat.set(k, [])
      byCat.get(k).push(q)
    })
    return [...byCat.entries()].map(([k, arr]) => ({
      key: k,
      bank: arr[0]?._bank || '',
      category: arr[0]?.category || '未分类',
      name: arr[0]?.category || '未分类',
      questions: arr,
      mix: ''
    }))
  }

  /* 考试·乱序：按题库名做种子打散后每 20 题一张，命名 模拟题1/2/3… */
  if (groupMode.value === 'random') {
    const seedKey = [...new Set(src.map((q) => q._bank || ''))].sort().join('|')
    const s = seededShuffle(src, seedFrom(seedKey || 'default'))
    const out = []
    for (let i = 0; i < s.length; i += GROUP_SIZE) {
      const part = s.slice(i, i + GROUP_SIZE)
      out.push({
        key: `r-${i}`,
        bank: part[0]?._bank || '',
        category: `模拟题${out.length + 1}`,
        name: `模拟题${out.length + 1}`,
        questions: part,
        mix: `${new Set(part.map((q) => q.category || '未分类')).size} 个知识点`
      })
    }
    return out
  }

  /* 考试·按知识点：每 20 题一张，用知识点命名 */
  const byCat = new Map()
  src.forEach((q) => {
    const k = `${q._bank || ''}||${q.category || '未分类'}`
    if (!byCat.has(k)) byCat.set(k, [])
    byCat.get(k).push(q)
  })
  const out = []
  for (const [, arr] of byCat) {
    const cat = arr[0]?.category || '未分类'
    const bank = arr[0]?._bank || ''
    const chunks = Math.ceil(arr.length / GROUP_SIZE)
    for (let i = 0; i < arr.length; i += GROUP_SIZE) {
      const part = arr.slice(i, i + GROUP_SIZE)
      const idx = i / GROUP_SIZE
      out.push({
        key: `${bank}||${cat}||${i}`,
        bank,
        category: cat,
        name: chunks > 1 ? `${cat} ${idx + 1}` : cat,
        questions: part,
        mix: `${arr.length} 题中的 ${part.length} 题`
      })
    }
  }
  return out
})

/* ===== 练习记录 → 卡片进度 ===== */
const records = ref({ practice: [], exam: [] })

async function loadRecords() {
  try {
    const { data } = await fetchPracticeRecordsAPI()
    records.value = { practice: data.practice || [], exam: data.exam || [] }
  } catch {
    /* 记录拿不到不影响练习本身 */
  }
}

/* 同一道题做多次只取最好成绩；答对 = 分数 >= 6（口径与后端统计一致） */
const progressMap = computed(() => {
  const best = new Map()
  records.value.practice.forEach((r) => {
    const k = `${r.bank}||${r.category}||${r.qid}`
    const s = Number(r.score || 0)
    if (!best.has(k) || s > best.get(k)) best.set(k, s)
  })
  const agg = new Map()
  for (const [k, s] of best) {
    const [bank, cat] = k.split('||')
    const key = `${bank}||${cat}`
    const g = agg.get(key) || { answered: 0, correct: 0 }
    g.answered += 1
    if (s >= 6) g.correct += 1
    agg.set(key, g)
  }
  return agg
})

const examCountMap = computed(() => {
  const m = new Map()
  records.value.exam.forEach((e) => {
    const k = `${e.bank || ''}||${e.card || ''}`
    m.set(k, (m.get(k) || 0) + 1)
  })
  return m
})

/* 实时概况：直接由本组件已加载的记录汇总，不再多打一次统计接口 */
const liveStat = computed(() => {
  let correct = 0
  let touched = 0
  for (const [, g] of progressMap.value) {
    correct += g.correct
    if (g.answered > 0) touched += 1
  }
  const total = questions.value.length
  return {
    correct,
    total,
    touched,
    percent: total ? Math.round((correct * 100) / total) : 0
  }
})

function progressOf(c) {  const g = progressMap.value.get(`${c.bank}||${c.category}`) || { answered: 0, correct: 0 }
  const total = questions.value.filter(
    (q) => (q._bank || '') === c.bank && (q.category || '未分类') === c.category
  ).length
  return {
    answered: g.answered,
    correct: g.correct,
    total,
    percent: total ? Math.round((g.correct * 100) / total) : 0
  }
}

function examCountOf(c) {
  return examCountMap.value.get(`${c.bank}||${c.category}`) || 0
}

function lastOf(c) {
  const key = `${c.bank}||${c.category}`
  const times = records.value.practice
    .filter((r) => `${r.bank || ''}||${r.category || ''}` === key)
    .map((r) => String(r.at || ''))
    .filter(Boolean)
    .sort()
  return times.length ? `上次练习 ${times[times.length - 1].slice(5, 16)}` : '尚未练习'
}

async function clearCard(c) {
  try {
    await clearPracticeRecordsAPI(c.bank, c.category)
    ElMessage.success('已清空这张卡的练习记录')
    await loadRecords()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '清空失败')
  }
}

/* ===== 自定义模拟试卷 ===== */
const customVisible = ref(false)
const customForm = reactive({ count: 20, difficulties: [], categories: [], ratios: {} })

const categoryPool = computed(() => {
  const s = new Set()
  questions.value.forEach((q) => q.category && s.add(q.category))
  return [...s]
})

/* 先按难度/知识点过滤出可抽的题池 */
const customPool = computed(() =>
  questions.value.filter((q) => {
    if (customForm.difficulties.length && !customForm.difficulties.includes(diffLabel(q.difficulty))) {
      return false
    }
    if (customForm.categories.length && !customForm.categories.includes(q.category || '未分类')) {
      return false
    }
    return true
  })
)

function openCustom() {
  customForm.count = 20
  customForm.difficulties = []
  customForm.categories = []
  customForm.ratios = {}
  customVisible.value = true
}

/**
 * 把总题数按占比分到各知识点。
 * 除不尽的余数补给占比最高的一项 —— 否则总数会和用户填的对不上
 * （比如 20 题按 3:3:3 分，每项 6.67，向下取整只有 18 题）。
 */
function allocation() {
  const cats = customForm.categories.length
    ? customForm.categories
    : [...new Set(customPool.value.map((q) => q.category || '未分类'))]
  const total = Number(customForm.count) || 0
  const out = {}
  if (!cats.length || total <= 0) return out

  const rs = cats.map((c) => ({ c, r: Number(customForm.ratios[c] ?? 0) }))
  const sum = rs.reduce((a, b) => a + b.r, 0)

  if (!sum) {
    const base = Math.floor(total / cats.length)
    let rest = total - base * cats.length
    cats.forEach((c) => {
      out[c] = base + (rest-- > 0 ? 1 : 0)
    })
    return out
  }

  let used = 0
  rs.forEach(({ c, r }) => {
    out[c] = Math.floor((total * r) / sum)
    used += out[c]
  })
  let rest = total - used
  const sorted = [...rs].sort((a, b) => b.r - a.r)
  let i = 0
  while (rest > 0 && sorted.length) {
    out[sorted[i % sorted.length].c] += 1
    rest--
    i++
  }
  return out
}

/* 预览：每个知识点实际能抽到几题 */
function planCount(c) {
  const want = allocation()[c] ?? 0
  const have = customPool.value.filter((q) => (q.category || '未分类') === c).length
  return Math.min(want, have)
}

function generateCustom() {
  const alloc = allocation()
  const picked = []
  Object.entries(alloc).forEach(([cat, n]) => {
    if (n <= 0) return
    const pool = shuffle(customPool.value.filter((q) => (q.category || '未分类') === cat))
    picked.push(...pool.slice(0, n))
  })
  if (!picked.length) {
    ElMessage.warning('按当前条件没抽到题，放宽一下难度或知识点')
    return
  }
  customVisible.value = false
  openCard({
    key: `custom-${Date.now()}`,
    bank: picked[0]?._bank || '',
    category: '自定义试卷',
    name: `自定义试卷（${picked.length} 题）`,
    questions: picked
  })
}

/**
 * 一次性把【所有题库】的题目拉下来并合并，每道题记上它属于哪个题库（_bank）。
 * 为什么不再按库单个加载：现在「岗位」这一行就是题库名称，
 * 选一个岗位等于选一个题库 —— 合并之后筛选和分组都在同一份数据上做，逻辑最简单。
 * 题库数量是个位数，逐个拉一遍不慢。
 */
async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await fetchBanksAPI()
    banks.value = data.banks || []
    const merged = []
    for (const b of banks.value) {
      try {
        const r = await fetchBankAPI(b.id)
        ;(r.data.questions || []).forEach((q) => merged.push({ ...q, _bank: b.name }))
      } catch {
        /* 单个库加载失败不影响其它库 */
      }
    }
    questions.value = merged
  } catch (e) {
    error.value = '题库加载失败：' + (e.response?.data?.detail || e.message)
  } finally {
    loading.value = false
  }
}

function openCard(c) {
  activeCard.value = c
  answers.value = c.questions.map(() => '')
  scores.value = c.questions.map(() => null)
  comments.value = c.questions.map(() => '')
  phase.value = 'answering'
  total.value = 0
  max.value = c.questions.length * 10
  scoringOne.value = -1
  itemEls.length = 0
  sheetOpen.value = false
  answering.value = true
  startTimer()
}

/** 退出答题：停止计时并把状态清干净，回到题库列表 */
function closeAnswering() {
  stopTimer()
  answering.value = false
  sheetOpen.value = false
  activeCard.value = null
}

/* ===== 计时（从进入答题开始累计，交卷后停住） ===== */
let timerId = null

function startTimer() {
  stopTimer()
  elapsed.value = 0
  timerId = setInterval(() => {
    elapsed.value += 1
  }, 1000)
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

onBeforeUnmount(stopTimer)

const elapsedText = computed(() => {
  const s = elapsed.value
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const p = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${p(m)}:${p(ss)}`
})

/* 答题卡：记录每题 DOM，点数字平滑滚动过去 */
const itemEls = []

function setItemEl(el, i) {
  if (el) itemEls[i] = el
}

function jumpTo(i) {
  const el = itemEls[i]
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  sheetOpen.value = false
}

const answeredCount = computed(() => answers.value.filter((a) => (a || '').trim()).length)

/** 单题评分（练习模式）：客观题本地判分，主观题交模型 */
async function scoreOne(i) {
  const q = activeCard.value.questions[i]
  if (!(answers.value[i] || '').trim()) {
    ElMessage.warning(isChoice(q) ? '先选一个答案' : '先写点内容再提交')
    return
  }

  // 客观题：本地比对正确答案，不调模型（省钱、秒出分）
  if (isChoice(q)) {
    gradeObjective(i)
    await persistRecords([i])
    await loadRecords()
    return
  }

  scoringOne.value = i
  try {
    const { data } = await scorePracticeAPI([
      { question: q.title, reference: q.answer, answer: answers.value[i] }
    ])
    const r = (data.results || [])[0] || {}
    scores.value[i] = r.score ?? 0
    comments.value[i] = r.comment || ''
    // 单题评完立刻落库，卡片进度环马上就能涨
    await persistRecords([i])
    await loadRecords()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '评分失败')
  } finally {
    scoringOne.value = -1
  }
}

function redoOne(i) {
  scores.value[i] = null
  comments.value[i] = ''
}

/* ============================================================
   客观题（单选 / 多选 / 判断）
   —— 有 options 的题不走 AI，直接本地比对正确答案，秒出分。
   ============================================================ */
function isChoice(q) {
  return Array.isArray(q?.options) && q.options.length > 0 && q.type !== '问答题'
}

/** 只看字母并排序，这样「AB」「ba」都算一样 */
function normAnswer(s) {
  return String(s || '')
    .toUpperCase()
    .split('')
    .filter((c) => c >= 'A' && c <= 'Z')
    .sort()
    .join('')
}

function chosen(i, key) {
  return String(answers.value[i] || '').includes(key)
}

function pick(i, key) {
  const q = activeCard.value.questions[i]
  if (q.type === '多选题') {
    const cur = new Set(String(answers.value[i] || '').split('').filter(Boolean))
    if (cur.has(key)) cur.delete(key)
    else cur.add(key)
    answers.value[i] = [...cur].sort().join('')
  } else {
    answers.value[i] = key
  }
}

/** 已经判过分 / 已交卷才显示对错标记和解析 */
function reveal(i) {
  return scores.value[i] != null || phase.value === 'graded'
}

function rightKey(q, key) {
  return normAnswer(q.correct).includes(key)
}

/** 客观题判分：全对 10 分，否则 0 分 */
function gradeObjective(i) {
  const q = activeCard.value.questions[i]
  const correct = normAnswer(q.correct)
  if (!correct) return false
  const right = normAnswer(answers.value[i]) === correct && !!normAnswer(answers.value[i])
  scores.value[i] = right ? 10 : 0
  comments.value[i] = right ? '回答正确' : `回答错误，正确答案：${correct}`
  return true
}

/* ===== 记录落库 ===== */

/** 把评完的题写成练习记录（一条 = 一道题的一次作答）。
 *  归属取【每道题自己的】题库和知识点，不是整张卡的 ——
 *  自定义试卷会混合多个知识点，按卡记会把进度算到错误的知识点上。 */
async function persistRecords(idxs) {
  const qs = activeCard.value.questions
  const rows = idxs
    .filter((i) => scores.value[i] != null)
    .map((i) => ({
      bank: qs[i]._bank || activeCard.value.bank,
      category: qs[i].category || activeCard.value.category,
      qid: qs[i].id,
      score: scores.value[i],
      // 作答原文一并存下来，练习记录详情里要和参考答案对照展示
      answer: answers.value[i] || ''
    }))
  if (!rows.length) return
  try {
    await savePracticeRecordsAPI(rows)
  } catch {
    ElMessage.warning('练习记录未能同步到服务器')
  }
}

/** 考试记录：整张卡一次成绩 */
async function persistExam(qs) {
  try {
    await saveExamRecordAPI({
      bank: activeCard.value.bank,
      card: activeCard.value.category,
      total: scores.value.reduce((a, b) => a + (b || 0), 0),
      max: qs.length * 10,
      count: qs.length,
      answered: scores.value.filter((s) => s != null).length,
      items: qs.map((q, i) => ({
        qid: q.id,
        score: scores.value[i] ?? 0,
        answer: answers.value[i] || ''
      }))
    })
  } catch {
    ElMessage.warning('考试记录未能同步到服务器')
  }
}

/** 整组评分：一次请求评完所有未评的题（逐题调用会慢十几倍） */
async function submitAll() {
  const qs = activeCard.value.questions

  // 客观题本地判分，只有主观题才需要调模型
  const objTodo = []
  const subTodo = []
  qs.forEach((q, i) => {
    if (scores.value[i] != null) return
    if (isChoice(q)) objTodo.push(i)
    else if ((answers.value[i] || '').trim()) subTodo.push(i)
  })
  objTodo.forEach((i) => gradeObjective(i))

  const finish = async () => {
    phase.value = 'graded'
    total.value = scores.value.reduce((a, b) => a + (b || 0), 0)
    max.value = qs.length * 10
    const done = scores.value.map((s, i) => (s != null ? i : -1)).filter((i) => i >= 0)
    await persistRecords(done)
    if (props.mode === 'exam') await persistExam(qs)
    await loadRecords()
  }

  if (!subTodo.length) {
    // 整张卡都是客观题（或主观题一题没答）：本地判完就能交卷
    const anyDone = scores.value.some((s) => s != null)
    if (!anyDone) {
      ElMessage.warning('一题都还没答，先选一个答案')
      return
    }
    await finish()
    return
  }

  grading.value = true
  try {
    const items = subTodo.map((i) => ({
      question: qs[i].title,
      reference: qs[i].answer,
      answer: answers.value[i] || ''
    }))
    const { data } = await scorePracticeAPI(items)
    ;(data.results || []).forEach((r, k) => {
      const i = subTodo[k]
      scores.value[i] = r.score ?? 0
      comments.value[i] = r.comment || ''
    })
    await finish()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '评分失败')
  } finally {
    grading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadAll(), loadRecords()])
})
</script>

<style scoped>
.qbp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.qbp-empty {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.9;
  color: var(--body-muted);
}
.qbp-filters {
  margin: 6px 0 10px;
  padding: 4px 14px;
  border-radius: var(--rad-block);
  background: var(--canvas-2);
}
.qbp-stat {
  font-size: 12.5px;
  color: var(--body-muted);
  margin-bottom: 12px;
}
.qbp-stat b {
  color: var(--accent);
}
.qbp-reset {
  margin-left: 10px;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
}
.qbp-reset:hover {
  text-decoration: underline;
}
.qbp-tip {
  margin-left: 10px;
}
.qbp-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
/* 卡片外围的进度环：conic-gradient 按 --p（0~100）画一段强调色弧，
   余下的用 hairline 补齐 —— 一个元素就能做到「环形进度条」，不用 SVG。 */
.qbp-card {
  padding: 3px;
  border-radius: var(--rad-block);
  background: conic-gradient(var(--accent) calc(var(--p, 0) * 1%), var(--hairline) 0);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}
.qbp-card:hover {
  transform: translateY(-2px);
}
.qbp-card-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px 14px;
  border-radius: calc(var(--rad-block) - 3px);
  background: var(--card-grad);
  backdrop-filter: blur(18px);
}
.qbp-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.qbp-card-meta {
  font-size: 12px;
  color: var(--body-muted);
}
.qbp-card-progress {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 2px;
}
.qbp-card-pct {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.qbp-card-sub {
  font-size: 11.5px;
  color: var(--body-muted);
}
.qbp-card-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 2px;
}
.qbp-card-last {
  font-size: 11px;
  color: var(--body-muted);
}
.qbp-card-clear {
  margin-left: auto;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 11px;
  color: var(--danger);
  cursor: pointer;
}
.qbp-card-clear:hover {
  text-decoration: underline;
}
.qbp-head-hint {
  font-size: 12px;
  color: var(--body-muted);
}
.qbp-head-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
/* 实时数据条 */
.qbp-live {
  display: flex;
  align-items: center;
  gap: 6px 22px;
  flex-wrap: wrap;
  padding: 8px 14px;
  margin-bottom: 14px;
  border-radius: var(--rad-block);
  background: var(--accent-wash);
  border: 1px solid var(--accent-line);
}
.qbp-live-item {
  font-size: 12.5px;
  color: var(--body-muted);
}
.qbp-live-item b {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  margin: 0 2px;
}
.qbp-live-item.muted {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.7;
}
/* 自定义试卷入口：虚线边框 + 淡强调底，和普通卡片同一套骨架但一眼能认出来 */
.qbp-card-custom .qbp-card-inner {
  border: 1px dashed var(--accent-line);
  background: var(--accent-wash);
}
/* ===== 自定义试卷配置弹窗 ===== */
.cq-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.cq-ratios {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.cq-ratio-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cq-ratio-name {
  flex: 1;
  font-size: 12.5px;
  color: var(--body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cq-ratio-unit {
  font-size: 12px;
  color: var(--body-muted);
}
.cq-ratio-num {
  width: 64px;
  font-size: 12px;
  color: var(--accent);
}
.cq-tip {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.8;
  color: var(--body-muted);
}
.cq-tip b {
  color: var(--ink);
}

/* ===== 作答面板 ===== */
.qp-total {
  padding: 12px 14px;
  margin-bottom: 14px;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent-line);
  background: var(--accent-wash);
  font-size: 13px;
  color: var(--body);
}
.qp-total b {
  font-size: 22px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
/* ============================================================
   答题页（页内排版，参考答题站的样式）
   ============================================================ */
.qp-bar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 4px 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--hairline);
  background: var(--card-grad);
  backdrop-filter: blur(18px);
}
.qp-exit {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  padding: 4px 6px;
  font-size: 13px;
  color: var(--body-muted);
  cursor: pointer;
  border-radius: 6px;
}
.qp-exit:hover {
  color: var(--accent);
  background: var(--accent-wash);
}
.qp-title {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qp-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.qp-timer {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--body);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}
.qp-done-tip {
  font-size: 12.5px;
  color: var(--accent);
}
.qp-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 70px;
}
.qp-card {
  padding: 18px 20px;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: var(--card-grad);
  scroll-margin-top: 70px;
}
.qp-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.qp-tag {
  padding: 1px 8px;
  border-radius: 5px;
  font-size: 11.5px;
  background: var(--accent-wash-2);
  color: var(--accent);
  white-space: nowrap;
}
.qp-tag.light {
  background: var(--canvas-2);
  color: var(--body-muted);
}
.qp-card-idx {
  font-size: 12px;
  color: var(--body-muted);
  font-variant-numeric: tabular-nums;
}
.qp-badge {
  margin-left: auto;
  padding: 1px 9px;
  border-radius: var(--rad-pill);
  font-size: 11.5px;
  font-weight: 600;
  background: var(--accent-wash-2);
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.qp-badge.low {
  background: var(--danger-wash);
  color: var(--danger);
}
.qp-q {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.8;
  color: var(--ink);
}

/* ===== 客观题选项 ===== */
.qp-opts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
}
.qp-opt {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 11px 14px;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: transparent;
  text-align: left;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--body);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}
.qp-opt:hover:not(:disabled) {
  border-color: var(--accent-line);
  background: var(--accent-wash);
}
.qp-opt:disabled {
  cursor: default;
  opacity: 0.85;
}
.qp-opt-key {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--body-muted);
  border: 1px solid var(--hairline);
  background: var(--canvas-2);
}
.qp-opt.active {
  border-color: var(--accent);
  background: var(--accent-wash);
}
.qp-opt.active .qp-opt-key {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: transparent;
}
/* 判分后：正确的选项标绿，选错的标红 */
.qp-opt.right {
  border-color: var(--accent);
  background: var(--accent-wash-2);
}
.qp-opt.right .qp-opt-key {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: transparent;
}
.qp-opt.wrong {
  border-color: var(--danger);
  background: var(--danger-wash);
}
.qp-opt.wrong .qp-opt-key {
  color: #fff;
  background: var(--danger);
  border-color: transparent;
}
.qp-opt-hint {
  font-size: 11.5px;
  color: var(--body-muted);
}
.qp-actions {
  margin-top: 10px;
}
.qp-comment {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--body-muted);
}
.qp-ref {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.9;
  color: var(--body);
  white-space: pre-wrap;
}
.qp-lbl {
  display: inline-block;
  margin-right: 6px;
  font-weight: 600;
  color: var(--body-muted);
}

/* ===== 左下答题卡 =====
   固定在左下角，但要让开左侧的导航条（rail + panel），
   否则会压在侧边栏上面。 */
.qp-sheet {
  position: fixed;
  left: calc(var(--rail-w, 64px) + var(--list-w, 300px) + 20px);
  bottom: 24px;
  z-index: 20;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: var(--card-grad);
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.14);
  overflow: hidden;
}
.qp-sheet-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 0;
  background: transparent;
  font-size: 12.5px;
  color: var(--body);
  cursor: pointer;
}
.qp-sheet-count {
  font-size: 11.5px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.qp-caret {
  font-size: 12px;
  color: var(--body-muted);
  transition: transform var(--dur-fast) var(--ease-out);
}
.qp-caret.up {
  transform: rotate(180deg);
}
.qp-sheet-body {
  display: grid;
  grid-template-columns: repeat(5, 32px);
  gap: 8px;
  padding: 4px 14px 14px;
  max-height: 210px;
  overflow-y: auto;
}
.qp-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--hairline);
  background: transparent;
  font-size: 12px;
  color: var(--body-muted);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition: all var(--dur-fast) var(--ease-out);
}
.qp-dot:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.qp-dot.done {
  border-color: var(--accent-line);
  background: var(--accent-wash);
  color: var(--accent);
}
.qp-dot.scored {
  border-color: transparent;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}
</style>
