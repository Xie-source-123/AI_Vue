<template>
  <section class="card qbp">
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

    <!-- ===== 作答面板 ===== -->
    <el-dialog
      v-model="dialogVisible"
      :title="activeCard?.name || ''"
      width="820px"
      :close-on-click-modal="false"
      append-to-body
      @closed="onDialogClosed"
    >
      <div v-if="activeCard" class="qp-body">
        <div v-if="phase === 'graded'" class="qp-total">
          总分 <b>{{ total }}</b> / {{ max }}（{{ activeCard.questions.length }} 题，平均
          {{ (total / Math.max(1, activeCard.questions.length)).toFixed(1) }} 分）
        </div>

        <div v-for="(q, i) in activeCard.questions" :key="q.id" class="qp-item">
          <div class="qp-item-head">
            <span class="qp-no">{{ i + 1 }}</span>
            <span class="qp-diff">{{ diffLabel(q.difficulty) }}</span>
            <span v-if="q.category" class="qp-cat">{{ q.category }}</span>
            <span v-if="scores[i] != null" class="qp-score" :class="{ low: scores[i] < 6 }">
              {{ scores[i] }} / 10
            </span>
          </div>
          <p class="qp-q">{{ q.title }}</p>
          <el-input
            v-model="answers[i]"
            type="textarea"
            :rows="2"
            placeholder="写下你的回答"
            :disabled="phase === 'graded' || scoringOne === i"
          />

          <!-- 练习模式：每题可以单独提交评分 -->
          <div v-if="mode === 'practice' && phase !== 'graded'" class="qp-actions">
            <el-button
              size="small"
              type="primary"
              plain
              :loading="scoringOne === i"
              :disabled="scores[i] != null"
              @click="scoreOne(i)"
            >
              提交评分
            </el-button>
            <el-button v-if="scores[i] != null" size="small" text @click="redoOne(i)">重答</el-button>
          </div>

          <p v-if="comments[i]" class="qp-comment">{{ comments[i] }}</p>
          <p v-if="scores[i] != null || phase === 'graded'" class="qp-ref">
            <span class="qp-lbl">参考答案</span>{{ q.answer || '（题库未提供）' }}
          </p>
        </div>
      </div>

      <template #footer>
        <span v-if="mode === 'practice'" class="qp-foot-tip">
          已评分 {{ scoredCount }} / {{ activeCard?.questions.length ?? 0 }} 题
        </span>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button
          v-if="mode === 'exam' && phase !== 'graded'"
          type="primary"
          :loading="grading"
          @click="submitAll"
        >
          交卷评分
        </el-button>
        <el-button v-if="mode === 'practice' && phase !== 'graded'" type="primary" @click="submitAll">
          整组评分（未评的补上）
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
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

const dialogVisible = ref(false)
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
const positionOptions = computed(() => {
  const counts = new Map()
  questions.value
    .filter((q) => !filters.category || (q.category || '未分类') === filters.category)
    .filter((q) => !filters.difficulty || diffLabel(q.difficulty) === filters.difficulty)
    .forEach((q) => {
      const k = q._bank || '未分类题库'
      counts.set(k, (counts.get(k) || 0) + 1)
    })
  const names = new Set(banks.value.map((b) => b.name).filter(Boolean))
  for (const k of counts.keys()) names.add(k)
  return [...names].filter(Boolean).map((n) => ({ value: n, label: n, count: counts.get(n) || 0 }))
})

const categoryOptions = computed(() => {
  const m = new Map()
  questions.value
    .filter((q) => !filters.position || q._bank === filters.position)
    .filter((q) => (!filters.difficulty || diffLabel(q.difficulty) === filters.difficulty))
    .forEach((q) => {
      const k = q.category || '未分类'
      m.set(k, (m.get(k) || 0) + 1)
    })
  return [...m.entries()].map(([value, count]) => ({ value, label: value, count }))
})

const difficultyOptions = computed(() => {
  const m = new Map()
  questions.value
    .filter((q) => !filters.position || q._bank === filters.position)
    .filter((q) => (!filters.category || (q.category || '未分类') === filters.category))
    .forEach((q) => {
      const k = diffLabel(q.difficulty)
      m.set(k, (m.get(k) || 0) + 1)
    })
  return DIFF_LIST.filter((d) => m.has(d)).map((d) => ({ value: d, label: d, count: m.get(d) }))
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

const scoredCount = computed(() => scores.value.filter((s) => s != null).length)

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
  dialogVisible.value = true
}

function onDialogClosed() {
  activeCard.value = null
}

/** 单题评分（练习模式） */
async function scoreOne(i) {
  const q = activeCard.value.questions[i]
  if (!(answers.value[i] || '').trim()) {
    ElMessage.warning('先写点内容再提交')
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
  const todo = []
  qs.forEach((q, i) => {
    if (scores.value[i] == null) todo.push(i)
  })
  if (!todo.length) {
    phase.value = 'graded'
    total.value = scores.value.reduce((a, b) => a + (b || 0), 0)
    return
  }
  if (todo.every((i) => !(answers.value[i] || '').trim())) {
    ElMessage.warning('一题都还没答，先写点内容')
    return
  }
  grading.value = true
  try {
    const items = todo.map((i) => ({
      question: qs[i].title,
      reference: qs[i].answer,
      answer: answers.value[i] || ''
    }))
    const { data } = await scorePracticeAPI(items)
    ;(data.results || []).forEach((r, k) => {
      const i = todo[k]
      scores.value[i] = r.score ?? 0
      comments.value[i] = r.comment || ''
    })
    phase.value = 'graded'
    total.value = scores.value.reduce((a, b) => a + (b || 0), 0)
    max.value = qs.length * 10

    // 落库：练习按题记；考试模式再额外记一条整场成绩
    await persistRecords(todo)
    if (props.mode === 'exam') await persistExam(qs)
    await loadRecords()
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
.qp-body {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 6px;
}
.qp-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--hairline);
}
.qp-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.qp-no {
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
.qp-diff,
.qp-cat {
  font-size: 11.5px;
  color: var(--body-muted);
}
.qp-score {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.qp-score.low {
  color: var(--danger);
}
.qp-q {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.75;
  color: var(--ink);
}
.qp-actions {
  margin-top: 8px;
}
.qp-comment {
  margin: 8px 0 0;
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
.qp-foot-tip {
  margin-right: 12px;
  font-size: 12.5px;
  color: var(--body-muted);
}
</style>
