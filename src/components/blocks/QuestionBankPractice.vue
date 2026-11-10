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

    <!-- ===== 答题页（页内排版，参考试卷样式） ===== -->
    <template v-else>
      <header class="qp-bar">
        <button class="qp-exit" @click="closeAnswering">‹ 退出答题</button>
        <span class="qp-title">{{ activeCard?.bank }} · {{ activeCard?.name }}</span>
        <div class="qp-bar-right">
          <span class="qp-timer">⏱ {{ elapsedText }}</span>
          <el-button size="small" :loading="clearing" @click="clearLastRecords">清空记录</el-button>
          <el-button
            v-if="pendingCount > 0 || phase !== 'graded'"
            type="primary"
            size="small"
            :loading="grading"
            @click="submitAll"
          >
            {{ mode === 'exam' ? '交卷' : '批改' }}
          </el-button>
          <span v-else class="qp-done-tip">{{ mode === 'exam' ? '已交卷' : '已批改' }}</span>
        </div>
      </header>

      <div v-if="phase === 'graded'" class="qp-total">
        总分 <b>{{ total }}</b> / {{ max }}
      </div>

      <div class="qp-layout">
        <!-- 左：试卷正文，按题型分节 -->
        <div class="qp-paper">
          <div v-for="(sec, si) in sections" :key="sec.type" class="qp-section">
            <h3 class="qp-section-title">
              {{ CN_NUM[si] || si + 1 }}. {{ sec.type }}（共 {{ sec.items.length }} 题）
            </h3>

            <div
              v-for="item in sec.items"
              :key="item.q.id"
              :ref="(el) => setItemEl(el, item.i)"
              class="qp-item"
            >
              <div class="qp-item-head">
                <span class="qp-item-no">{{ item.i + 1 }}.</span>
                <span class="qp-item-type">（{{ item.q.type || '问答题' }}）</span>
                <span v-if="item.q.difficulty" class="qp-item-diff">{{ diffLabel(item.q.difficulty) }}</span>
                <span
                  v-if="scores[item.i] != null"
                  class="qp-item-score"
                  :class="{ low: scores[item.i] < 6 }"
                >
                  {{ scores[item.i] }} 分
                </span>
              </div>

              <p class="qp-item-title">{{ item.q.title }}</p>

              <!-- 客观题：A./B./C./D. 各占一行 -->
              <div v-if="isChoice(item.q)" class="qp-opts">
                <button
                  v-for="o in item.q.options"
                  :key="o.key"
                  class="qp-opt"
                  :class="{
                    active: chosen(item.i, o.key),
                    right: reveal(item.i) && rightKey(item.q, o.key),
                    wrong:
                      reveal(item.i) && chosen(item.i, o.key) && !rightKey(item.q, o.key)
                  }"
                  :disabled="scores[item.i] != null"
                  @click="pick(item.i, o.key)"
                >
                  <span class="qp-opt-key">{{ o.key }}.</span>
                  <span class="qp-opt-text">{{ o.text }}</span>
                </button>
              </div>

              <!-- 主观题：文本框作答 -->
              <el-input
                v-else
                v-model="answers[item.i]"
                type="textarea"
                :rows="4"
                placeholder="写下你的回答"
                :disabled="scores[item.i] != null || scoringOne === item.i"
              />

              <!-- 我的答案 -->
              <div v-if="(answers[item.i] || '').trim()" class="qp-myanswer">
                <span class="qp-myanswer-lbl">我的答案：</span>
                <span class="qp-myanswer-text">
                  {{
                    isChoice(item.q)
                      ? answers[item.i]
                      : answers[item.i].slice(0, 80) + (answers[item.i].length > 80 ? '…' : '')
                  }}
                </span>
              </div>

              <div v-if="mode === 'practice' && scores[item.i] == null" class="qp-actions">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :loading="scoringOne === item.i"
                  :disabled="scores[item.i] != null"
                  @click="scoreOne(item.i)"
                >
                  {{ isChoice(item.q) ? '确认答案' : '提交评分' }}
                </el-button>
                <el-button v-if="scores[item.i] != null" size="small" text @click="redoOne(item.i)">
                  重答
                </el-button>
              </div>

              <p v-if="comments[item.i]" class="qp-comment">{{ comments[item.i] }}</p>
              <p v-if="item.q.explain && reveal(item.i)" class="qp-ref">
                <span class="qp-lbl">解析</span>{{ item.q.explain }}
              </p>
              <p
                v-if="!isChoice(item.q) && scores[item.i] != null"
                class="qp-ref"
              >
                <span class="qp-lbl">参考答案</span>{{ item.q.answer || '（题库未提供）' }}
              </p>
            </div>
          </div>
        </div>

        <!-- 右：答题卡，按题型分节 -->
        <aside class="qp-side">
          <div class="qp-side-card">
            <div v-for="(sec, si) in sections" :key="sec.type" class="qp-side-sec">
              <div class="qp-side-title">
                <span>{{ CN_NUM[si] || si + 1 }}. {{ sec.type }}</span>
                <span class="qp-side-count">{{ sec.items.length }} 题</span>
              </div>
              <div class="qp-side-grid">
                <button
                  v-for="item in sec.items"
                  :key="item.q.id"
                  class="qp-dot"
                  :class="{
                    done: (answers[item.i] || '').trim(),
                    scored: scores[item.i] != null,
                    wrong: scores[item.i] != null && scores[item.i] < 6
                  }"
                  @click="jumpTo(item.i)"
                >
                  {{ item.i + 1 }}
                </button>
              </div>
            </div>
            <div class="qp-side-foot">
              已答 {{ answeredCount }} / {{ activeCard?.questions.length || 0 }}
            </div>
          </div>
        </aside>
      </div>
    </template>

    <!-- ===== 交卷点评（弹窗） ===== -->
    <el-dialog
      v-model="summaryVisible"
      :title="mode === 'exam' ? '本次模拟考试点评' : '本次练习点评'"
      width="480px"
      :close-on-click-modal="false"
      :show-close="false"
      append-to-body
    >
      <div class="qp-summary">
        <div class="qp-summary-score">
          总分 <b>{{ total }}</b> / {{ max }}
        </div>
        <p v-if="summaryLoading" class="qp-summary-loading">正在生成点评…</p>
        <p v-else class="qp-summary-text">{{ summaryText }}</p>
      </div>
      <template #footer>
        <el-button @click="viewAnswers">查看答题</el-button>
        <el-button type="primary" @click="exitWithSummary">退出答题</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchBanksAPI,
  fetchBankAPI,
  scorePracticeAPI,
  fetchPracticeRecordsAPI,
  savePracticeRecordsAPI,
  saveExamRecordAPI,
  clearPracticeRecordsAPI,
  deleteExamRecordAPI,
  summarizePracticeAPI,
  saveSummaryAPI
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

/* ===== 交卷点评 ===== */
const summaryVisible = ref(false)
const summaryText = ref('')
const summaryLoading = ref(false)
const summaryRef = ref('')     // 练习=批次时间戳 / 考试=考试记录 id
const lastPracticeAt = ref('')
const lastExamId = ref('')
const clearing = ref(false)
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

/* 知识点跟着岗位走：选了岗位，只列出该岗位（题库）涉及的知识点。
   难度与知识点之间【不联动】—— 你的题库里难度和知识点基本是 1:1 的，
   再联动会让标签大面积消失（之前那个「必须先选难度」的假象就是这么来的）。 */
const categoryOptions = computed(() => {
  const src = filters.position
    ? questions.value.filter((q) => (q._bank || '') === filters.position)
    : questions.value
  const names = [...new Set(src.map((q) => q.category || '未分类'))]
  return names.map((c) => ({
    value: c,
    label: c,
    count: src.filter(
      (q) =>
        (q.category || '未分类') === c &&
        (!filters.difficulty || diffLabel(q.difficulty) === filters.difficulty)
    ).length
  }))
})

/* 换岗位后，原先选中的知识点若不在新岗位里就自动清掉 */
const visibleCategories = computed(() => categoryOptions.value.map((o) => o.value))
watch(visibleCategories, (list) => {
  if (filters.category && !list.includes(filters.category)) filters.category = ''
})

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
  const qs = c.questions
  answers.value = qs.map(() => '')
  scores.value = qs.map(() => null)
  comments.value = qs.map(() => '')
  total.value = 0
  max.value = qs.length * 10
  scoringOne.value = -1
  itemEls.length = 0
  sheetOpen.value = false

  /* 回填历史作答：做过的题保持已完成状态，不用重复做。
     同一道题做过多次时取历史最好成绩（与进度环口径一致）。 */
  const best = new Map()
  records.value.practice.forEach((r) => {
    const qid = String(r.qid || '')
    if (!qid) return
    const prev = best.get(qid)
    if (!prev || Number(r.score) > Number(prev.score)) best.set(qid, r)
  })
  qs.forEach((q, i) => {
    const hit = best.get(String(q.id))
    if (hit) {
      scores.value[i] = Number(hit.score) || 0
      answers.value[i] = hit.answer || ''
    }
  })

  phase.value = 'answering'
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

/** 已作答但还没批改的题数 —— 决定「批改」按钮还该不该亮 */
const pendingCount = computed(() => {
  const qs = activeCard.value?.questions || []
  return qs.filter((q, i) => scores.value[i] == null && (answers.value[i] || '').trim()).length
})

/* ===== 试卷分节：按题型分组，单选的排前面，问答题排最后 ===== */
const CN_NUM = ['一', '二', '三', '四', '五', '六']
const TYPE_ORDER = ['单选题', '多选题', '判断题', '问答题']

const sections = computed(() => {
  const qs = activeCard.value?.questions || []
  const groups = new Map()
  qs.forEach((q, i) => {
    const t = q.type || '问答题'
    if (!groups.has(t)) groups.set(t, [])
    groups.get(t).push({ q, i })
  })
  return [...groups.entries()]
    .sort((a, b) => {
      const ia = TYPE_ORDER.indexOf(a[0])
      const ib = TYPE_ORDER.indexOf(b[0])
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
    .map(([type, items]) => ({ type, items }))
})

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

/** 只有【被批改过】的题才显示对错标记和解析；
 *  没作答的题不批改，也就绝不能泄露答案。 */
function reveal(i) {
  return scores.value[i] != null
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
    const { data } = await savePracticeRecordsAPI(rows)
    // 后端返回的批次时间戳，点评要用它挂到这批记录上
    lastPracticeAt.value = data?.at || ''
  } catch {
    ElMessage.warning('练习记录未能同步到服务器')
  }
}

/** 考试记录：整张卡一次成绩 */
async function persistExam(qs) {
  try {
    const { data } = await saveExamRecordAPI({
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
    lastExamId.value = data?.exam?.id || ''
  } catch {
    ElMessage.warning('考试记录未能同步到服务器')
  }
}

/** 批改：只批改「已作答且还没批过」的题，没答的跳过不批 */
async function submitAll() {
  const qs = activeCard.value.questions

  // 客观题本地判分，主观题才需要调模型
  const objTodo = []
  const subTodo = []
  qs.forEach((q, i) => {
    if (scores.value[i] != null) return          // 已批过（含历史作答回填）的跳过
    if (!(answers.value[i] || '').trim()) return // 未作答的不批
    if (isChoice(q)) objTodo.push(i)
    else subTodo.push(i)
  })

  // 本次新批出来的题，落库时只写这些，避免把历史记录重复写一遍
  const newlyGraded = [...objTodo]
  objTodo.forEach((i) => gradeObjective(i))

  const finish = async () => {
    phase.value = 'graded'
    total.value = scores.value.reduce((a, b) => a + (b || 0), 0)
    // 满分按【已批改的题数】算：未作答的题不参与批改，也不该拉低得分率
    const gradedCount = scores.value.filter((s) => s != null).length
    max.value = Math.max(1, gradedCount) * 10
    await persistRecords(newlyGraded)
    if (props.mode === 'exam') await persistExam(qs)
    await loadRecords()
    await buildSummary(qs)
  }

  if (!subTodo.length) {
    if (!newlyGraded.length) {
      // 没有新题可批：要么全没答，要么之前都批过了
      const anyDone = scores.value.some((s) => s != null)
      if (!anyDone) {
        ElMessage.warning('还没有作答的题目，先答几题再批改')
        return
      }
      ElMessage.info('本次没有需要批改的新题目')
      await finish()
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
      newlyGraded.push(i)
    })
    await finish()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '评分失败')
  } finally {
    grading.value = false
  }
}

/* ============================================================
   一键清空：只清「上一次」那次作答，不影响更早的历史
   ============================================================ */
async function clearLastRecords() {
  const isExam = props.mode === 'exam'
  const hasTarget = isExam ? !!lastExamId.value : !!lastPracticeAt.value
  try {
    await ElMessageBox.confirm(
      hasTarget
        ? `清空上一次${isExam ? '模拟考试' : '练习'}的答题记录？清空后本次作答会重置，可以重新做一遍。`
        : `这次还没有保存过记录，要清空这张卡的全部历史记录吗？`,
      '一键清空',
      { confirmButtonText: '清空', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  clearing.value = true
  try {
    if (isExam) {
      if (lastExamId.value) await deleteExamRecordAPI(lastExamId.value)
      lastExamId.value = ''
    } else {
      await clearPracticeRecordsAPI(
        activeCard.value?.bank || '',
        activeCard.value?.category || '',
        lastPracticeAt.value || ''
      )
      lastPracticeAt.value = ''
    }

    // 本地状态一起重置，回到可作答
    const qs = activeCard.value?.questions || []
    answers.value = qs.map(() => '')
    scores.value = qs.map(() => null)
    comments.value = qs.map(() => '')
    total.value = 0
    max.value = qs.length * 10
    phase.value = 'answering'
    await loadRecords()
    ElMessage.success('已清空上一次的答题记录')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '清空失败')
  } finally {
    clearing.value = false
  }
}

/* ============================================================
   交卷点评：先弹窗给用户看，退出答题时才落库
   ============================================================ */
async function buildSummary(qs) {
  summaryRef.value = props.mode === 'exam' ? lastExamId.value : lastPracticeAt.value
  summaryText.value = ''
  summaryLoading.value = true
  summaryVisible.value = true
  try {
    const items = qs
      .map((q, i) =>
        scores.value[i] != null ? { type: q.type || '问答题', score: scores.value[i] } : null
      )
      .filter(Boolean)
    const { data } = await summarizePracticeAPI({
      items,
      total: total.value,
      max: max.value,
      mode: props.mode
    })
    summaryText.value = data.summary || ''
  } catch {
    summaryText.value = '本次已完成，点评没能生成，成绩已记录。'
  } finally {
    summaryLoading.value = false
  }
}

/** 关闭点评、留在答题页查看作答（只读） */
function viewAnswers() {
  summaryVisible.value = false
  phase.value = 'graded'
}

/** 退出答题：这时才把点评写进记录，然后离开答题页 */
async function exitWithSummary() {
  const text = (summaryText.value || '').trim()
  summaryVisible.value = false
  if (text) {
    try {
      await saveSummaryAPI({
        mode: props.mode,
        ref: summaryRef.value,
        bank: activeCard.value?.bank || '',
        card: activeCard.value?.category || '',
        total: total.value,
        max: max.value,
        count: activeCard.value?.questions.length || 0,
        summary: text
      })
      await loadRecords()
    } catch {
      ElMessage.warning('点评未能保存到记录')
    }
  }
  closeAnswering()
}

onMounted(async () => {
  await Promise.all([loadAll(), loadRecords()])
})</script>

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
   答题页（试卷样式：左侧题目 + 右侧答题卡）
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
}
.qp-done-tip {
  font-size: 12.5px;
  color: var(--accent);
}
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

/* ===== 两栏：试卷 + 答题卡 ===== */
.qp-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 22px;
  align-items: start;
}
.qp-paper {
  min-width: 0;
  padding-bottom: 40px;
}
.qp-section + .qp-section {
  margin-top: 28px;
}
.qp-section-title {
  margin: 0 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--hairline);
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}
.qp-item {
  padding: 14px 0 18px;
  border-bottom: 1px dashed var(--hairline);
  scroll-margin-top: 84px;
}
.qp-item:last-child {
  border-bottom: 0;
}
.qp-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.qp-item-no {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.qp-item-type,
.qp-item-diff {
  font-size: 12px;
  color: var(--body-muted);
}
.qp-item-score {
  margin-left: auto;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.qp-item-score.low {
  color: var(--danger);
}
.qp-item-title {
  margin: 0 0 12px;
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--ink);
  white-space: pre-wrap;
}

/* ===== 选项：A. 单独一行，文本在下方 ===== */
.qp-opts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.qp-opt {
  display: flex;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--body);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.qp-opt:hover:not(:disabled) {
  background: var(--accent-wash);
}
.qp-opt:disabled {
  cursor: default;
}
.qp-opt-key {
  flex-shrink: 0;
  width: 20px;
  font-weight: 600;
  color: var(--body-muted);
}
.qp-opt-text {
  flex: 1;
}
.qp-opt.active {
  background: var(--accent-wash-2);
  border-color: var(--accent-line);
}
.qp-opt.active .qp-opt-key {
  color: var(--accent);
}
.qp-opt.right {
  background: var(--accent-wash-2);
  border-color: var(--accent);
}
.qp-opt.right .qp-opt-key {
  color: var(--accent);
}
.qp-opt.wrong {
  background: var(--danger-wash);
  border-color: var(--danger);
}
.qp-opt.wrong .qp-opt-key {
  color: var(--danger);
}

/* ===== 我的答案 ===== */
.qp-myanswer {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--hairline);
  background: var(--canvas-2);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--body);
}
.qp-myanswer-lbl {
  color: var(--body-muted);
}
.qp-myanswer-text {
  color: var(--accent);
  font-weight: 600;
}
.qp-actions {
  margin-top: 10px;
}
.qp-comment {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--body-muted);
}
.qp-ref {
  margin: 8px 0 0;
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

/* ===== 右侧答题卡 ===== */
.qp-side {
  position: sticky;
  top: 12px;
  align-self: start;
}
.qp-side-card {
  padding: 14px 16px;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: var(--card-grad);
  backdrop-filter: blur(18px);
}
.qp-side-sec + .qp-side-sec {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--hairline);
}
.qp-side-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--body);
}
.qp-side-count {
  font-weight: 400;
  color: var(--body-muted);
}
.qp-side-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.qp-dot {
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--hairline);
  background: var(--canvas-2);
  font-size: 11.5px;
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
/* 批改后答错的题在答题卡上标红，方便一眼找到要复盘的题 */
.qp-dot.wrong {
  border-color: transparent;
  background: var(--danger);
  color: #fff;
  font-weight: 600;
}
.qp-side-foot {
  margin-top: 12px;
  text-align: right;
  font-size: 11.5px;
  color: var(--body-muted);
}
@media (max-width: 1100px) {
  .qp-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .qp-side {
    position: static;
  }
}

/* ===== 交卷点评弹窗 ===== */
.qp-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.qp-summary-score {
  padding: 10px 14px;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent-line);
  background: var(--accent-wash);
  font-size: 12.5px;
  color: var(--body);
}
.qp-summary-score b {
  font-size: 20px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.qp-summary-text {
  margin: 0;
  padding: 14px 16px;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: var(--canvas-2);
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink);
  text-align: justify;
}
.qp-summary-loading {
  margin: 0;
  padding: 18px 0;
  text-align: center;
  font-size: 13px;
  color: var(--body-muted);
}</style>
