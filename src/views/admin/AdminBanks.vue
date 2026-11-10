<template>
  <div class="a-page">
    <!-- ==================== 导入预览（覆盖整页，非弹窗） ==================== -->
    <template v-if="previewing">
      <div class="a-card">
        <div class="a-card-head">
          <div>
            <div class="a-card-title">导入预览</div>
            <div class="a-card-sub">
              共解析 <b class="hl">{{ preview.length }}</b> 题 ·
              待补充 <b :class="lackingCount ? 'bad' : 'hl'">{{ lackingCount }}</b> 题 ·
              工作表：{{ previewSheets.join('、') || '—' }}
            </div>
          </div>
          <div class="a-toolbar">
            <el-input v-model="previewName" placeholder="题库名称" style="width: 240px" />
            <el-button @click="cancelPreview">取消导入</el-button>
            <el-button type="primary" :loading="committing" @click="confirmImport">
              确认导入
            </el-button>
          </div>
        </div>

        <p class="q-note">
          <el-icon :size="13"><InfoFilled /></el-icon>
          下面是系统从表格里读出来的内容。<b>确认前没有任何数据写入</b>；
          标红的行是没读到选项或答案的，点「修改」补好再导入。
        </p>

        <el-table v-loading="parsing" :data="preview" size="small" height="62vh">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="type" label="题型" width="90" />
          <el-table-column label="题干" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">{{ row.title }}</template>
          </el-table-column>
          <el-table-column label="选项" min-width="200">
            <template #default="{ row }">
              <span v-if="row.options && row.options.length" class="q-opts-mini">
                <span v-for="o in row.options" :key="o.key" class="q-opt-mini">
                  {{ o.key }}. {{ o.text }}
                </span>
              </span>
              <span v-else class="q-none">—</span>
            </template>
          </el-table-column>
          <el-table-column label="答案" width="96">
            <template #default="{ row }">
              <span :class="{ bad: (row.missing || []).includes('正确答案') }">
                {{ row.correct || '缺' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="150">
            <template #default="{ row }">
              <el-tag v-if="!(row.missing || []).length" size="small" type="success" effect="plain">
                完整
              </el-tag>
              <el-tag v-else size="small" type="danger" effect="plain">
                待补充：{{ row.missing.join('、') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row, $index }">
              <el-button link type="primary" size="small" @click="editPreview(row, $index)">
                修改
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- ==================== 正常页 ==================== -->
    <template v-else>
      <!-- 题库列表 -->
      <div class="a-card">
        <div class="a-card-head">
          <div>
            <div class="a-card-title">题库</div>
            <div class="a-card-sub">共 {{ banks.length }} 个题库 · 合计 {{ allQuestions.length }} 题</div>
          </div>
          <div class="a-toolbar">
            <el-button :icon="Refresh" :loading="loading" @click="loadAll">刷新</el-button>
            <el-button :icon="Plus" @click="openCreateBank">新建空题库</el-button>
            <el-button type="primary" :icon="Upload" :loading="parsing" @click="pickFile">
              上传 Excel
            </el-button>
            <input ref="fileInput" type="file" accept=".xlsx" style="display: none" @change="onFileChange" />
          </div>
        </div>

        <el-table :data="banks" size="small" empty-text="还没有题库，上传一个 Excel 试试">
          <el-table-column prop="name" label="题库名称" min-width="220" show-overflow-tooltip />
          <el-table-column prop="source" label="来源文件" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="q-none">{{ row.source || '手动创建' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="count" label="题数" width="80" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click.stop="renameBank(row)">重命名</el-button>
              <el-button link type="danger" size="small" @click.stop="removeBank(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 题目管理 -->
      <div class="a-card">
        <div class="a-card-head">
          <div>
            <div class="a-card-title">题目管理</div>
            <div class="a-card-sub">
              共 <b class="hl">{{ filteredQuestions.length }}</b> / {{ allQuestions.length }} 题 ·
              待补充 <b :class="lackingTotal ? 'bad' : 'hl'">{{ lackingTotal }}</b> 题
            </div>
          </div>
          <div class="a-toolbar">
            <el-input
              v-model="keyword"
              placeholder="搜索题干 / 选项 / 解析…"
              :prefix-icon="Search"
              clearable
              style="width: 230px"
            />
            <el-button type="primary" :icon="Plus" @click="openCreate">新增题目</el-button>
          </div>
        </div>

        <!-- 定位条：岗位（全部）/ 知识点 / 难度 / 题型 -->
        <div class="q-filters">
          <FilterRow v-model="fPosition" label="岗位" :items="positionOptions" :total="allQuestions.length" />
          <FilterRow v-model="fCategory" label="知识点" :items="categoryOptions" :total="allQuestions.length" />
          <FilterRow v-model="fDifficulty" label="难度" :items="difficultyOptions" :total="allQuestions.length" />
          <FilterRow v-model="fType" label="题型" :items="typeOptions" :total="allQuestions.length" />
        </div>

        <div v-if="hasActiveFilter || keyword" class="q-clear-row">
          <button class="q-clear" @click="clearFilters">清空全部定位条件</button>
        </div>

        <el-table v-loading="loading" :data="pagedQuestions" size="small" empty-text="没有符合条件的题目">
          <el-table-column prop="no" label="题号" width="66" />
          <el-table-column prop="type" label="题型" width="86" />
          <el-table-column label="题干" min-width="230" show-overflow-tooltip>
            <template #default="{ row }">{{ row.title }}</template>
          </el-table-column>
          <el-table-column label="选项" min-width="180">
            <template #default="{ row }">
              <span v-if="row.options && row.options.length" class="q-opts-mini">
                <span v-for="o in row.options" :key="o.key" class="q-opt-mini">
                  {{ o.key }}. {{ o.text }}
                </span>
              </span>
              <span v-else class="q-none">—</span>
            </template>
          </el-table-column>
          <el-table-column label="答案/参考" width="110">
            <template #default="{ row }">
              <span v-if="isObjective(row)">{{ row.correct || '缺' }}</span>
              <span v-else class="q-none" :title="row.answer">参考答案</span>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="知识点" width="130" show-overflow-tooltip />
          <el-table-column prop="difficulty" label="难度" width="76" />
          <el-table-column prop="bank" label="岗位/题库" width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag v-if="!(row.missing || []).length" size="small" type="success" effect="plain">完整</el-tag>
              <el-tag v-else size="small" type="danger" effect="plain" :title="row.missing.join('、')">
                待补充
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="removeQuestion(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="filteredQuestions.length > pageSize"
          :total="filteredQuestions.length"
          :page-size="pageSize"
          :current-page="page"
          layout="total, prev, pager, next"
          class="q-pager"
          @current-change="(p) => (page = p)"
        />
      </div>
    </template>

    <!-- ==================== 新增 / 编辑题目 ==================== -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" append-to-body>
      <el-form :model="form" label-position="top">
        <div class="q-grid">
          <el-form-item label="题型">
            <el-select v-model="form.type" style="width: 100%" @change="onTypeChange">
              <el-option v-for="t in TYPE_LIST" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="form.difficulty" style="width: 100%">
              <el-option label="基础（简单）" value="基础" />
              <el-option label="进阶（适中）" value="进阶" />
              <el-option label="真题（难）" value="真题" />
            </el-select>
          </el-form-item>
          <el-form-item label="知识点分类">
            <el-input v-model="form.category" placeholder="如：Hadoop生态" />
          </el-form-item>
          <el-form-item label="岗位">
            <el-input v-model="form.position" placeholder="如：大数据分析工程师" />
          </el-form-item>
        </div>

        <el-form-item v-if="dialogMode === 'create'" label="归入题库">
          <el-select v-model="form.bankId" style="width: 100%" placeholder="选择题库">
            <el-option v-for="b in banks" :key="b.id" :label="`${b.name}（${b.count} 题）`" :value="b.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="题干">
          <el-input v-model="form.title" type="textarea" :rows="2" placeholder="题目内容" />
        </el-form-item>

        <!-- 客观题：选项 + 正确答案 -->
        <template v-if="isObjectiveForm">
          <el-form-item label="选项">
            <div class="q-opt-edit">
              <div v-for="o in form.options" :key="o.key" class="q-opt-row">
                <span class="q-opt-key">{{ o.key }}</span>
                <el-input v-model="o.text" :placeholder="`选项 ${o.key} 内容`" />
              </div>
              <el-button
                v-if="form.type !== '判断题' && form.options.length < 6"
                size="small"
                text
                @click="addOption"
              >
                + 添加选项
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="正确答案">
            <el-select
              v-if="form.type === '多选题'"
              v-model="multiCorrect"
              multiple
              style="width: 100%"
              placeholder="可多选"
            >
              <el-option
                v-for="o in form.options"
                :key="o.key"
                :label="`${o.key}. ${o.text || '(空)'}`"
                :value="o.key"
              />
            </el-select>
            <el-select v-else v-model="form.correct" style="width: 100%" placeholder="选择正确答案">
              <el-option
                v-for="o in form.options"
                :key="o.key"
                :label="`${o.key}. ${o.text || '(空)'}`"
                :value="o.key"
              />
            </el-select>
          </el-form-item>
        </template>

        <!-- 主观题：参考答案 -->
        <el-form-item v-else label="参考答案">
          <el-input v-model="form.answer" type="textarea" :rows="4" placeholder="评分时对照的参考答案" />
        </el-form-item>

        <el-form-item label="解析（判分后展示，可留空）">
          <el-input v-model="form.explain" type="textarea" :rows="2" placeholder="为什么是这个答案" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Upload, InfoFilled } from '@element-plus/icons-vue'
import FilterRow from '@/components/blocks/FilterRow.vue'
import {
  fetchBanksAdminAPI,
  parseBankAPI,
  commitBankAPI,
  fetchAllQuestionsAPI,
  createBankAPI,
  deleteBankAPI,
  renameBankAPI,
  addQuestionAPI,
  updateQuestionAPI,
  deleteQuestionAPI,
  adminErrorText
} from '@/api/admin.js'

/* ==================== 状态 ==================== */
const banks = ref([])
const allQuestions = ref([])
const loading = ref(false)
const parsing = ref(false)
const committing = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = 20

const keyword = ref('')
const fPosition = ref('')
const fCategory = ref('')
const fDifficulty = ref('')
const fType = ref('')

/* 预览 */
const previewing = ref(false)
const preview = ref([])
const previewName = ref('')
const previewSheets = ref([])
const previewIndex = ref(-1)

const fileInput = ref(null)

const TYPE_LIST = ['单选题', '多选题', '判断题', '问答题']
const OBJECTIVE = ['单选题', '多选题', '判断题']

const isObjective = (q) => OBJECTIVE.includes(q?.type)
const isObjectiveForm = computed(() => OBJECTIVE.includes(form.type))

/* ==================== 数据加载 ==================== */
async function loadBanks() {
  const { data } = await fetchBanksAdminAPI()
  banks.value = data.banks || []
}

async function loadAllQuestions() {
  const { data } = await fetchAllQuestionsAPI()
  allQuestions.value = data.questions || []
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadBanks(), loadAllQuestions()])
  } catch (e) {
    ElMessage.error(adminErrorText(e, '加载失败'))
  } finally {
    loading.value = false
  }
}

/* ==================== 定位与筛选 ==================== */
function optionsOf(pick, keep) {
  const m = new Map()
  allQuestions.value.filter(keep).forEach((q) => {
    const v = pick(q)
    if (v) m.set(v, (m.get(v) || 0) + 1)
  })
  return [...m.entries()].map(([value, count]) => ({ value, label: value, count }))
}

const positionOptions = computed(() =>
  optionsOf(
    (q) => q.position || q.bank,
    (q) =>
      (!fCategory.value || q.category === fCategory.value) &&
      (!fDifficulty.value || q.difficulty === fDifficulty.value) &&
      (!fType.value || (q.type || '问答题') === fType.value)
  )
)

const categoryOptions = computed(() =>
  optionsOf(
    (q) => q.category || '未分类',
    (q) =>
      (!fPosition.value || (q.position || q.bank) === fPosition.value) &&
      (!fDifficulty.value || q.difficulty === fDifficulty.value) &&
      (!fType.value || (q.type || '问答题') === fType.value)
  )
)

const difficultyOptions = computed(() =>
  optionsOf(
    (q) => q.difficulty || '基础',
    (q) =>
      (!fPosition.value || (q.position || q.bank) === fPosition.value) &&
      (!fCategory.value || q.category === fCategory.value) &&
      (!fType.value || (q.type || '问答题') === fType.value)
  )
)

const typeOptions = computed(() =>
  optionsOf(
    (q) => q.type || '问答题',
    (q) =>
      (!fPosition.value || (q.position || q.bank) === fPosition.value) &&
      (!fCategory.value || q.category === fCategory.value) &&
      (!fDifficulty.value || q.difficulty === fDifficulty.value)
  )
)

const hasActiveFilter = computed(
  () => !!(fPosition.value || fCategory.value || fDifficulty.value || fType.value)
)

function clearFilters() {
  fPosition.value = ''
  fCategory.value = ''
  fDifficulty.value = ''
  fType.value = ''
  keyword.value = ''
  page.value = 1
}

const filteredQuestions = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return allQuestions.value.filter((q) => {
    if (fPosition.value && (q.position || q.bank) !== fPosition.value) return false
    if (fCategory.value && (q.category || '未分类') !== fCategory.value) return false
    if (fDifficulty.value && (q.difficulty || '基础') !== fDifficulty.value) return false
    if (fType.value && (q.type || '问答题') !== fType.value) return false
    if (!k) return true
    const hay = [
      q.title,
      q.correct,
      q.answer,
      q.explain,
      q.category,
      q.position,
      ...(q.options || []).map((o) => o.text)
    ]
    return hay.some((v) => String(v || '').toLowerCase().includes(k))
  })
})

const pagedQuestions = computed(() =>
  filteredQuestions.value.slice((page.value - 1) * pageSize, page.value * pageSize)
)

const lackingTotal = computed(() => allQuestions.value.filter((q) => (q.missing || []).length).length)
const lackingCount = computed(() => preview.value.filter((q) => (q.missing || []).length).length)

/* ==================== 上传 → 预览 ==================== */
function pickFile() {
  fileInput.value?.click()
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!/\.xlsx$/i.test(file.name)) {
    ElMessage.warning('目前只支持 .xlsx 格式')
    return
  }
  parsing.value = true
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = reject
      r.readAsDataURL(file)
    })
    const dataBase64 = String(dataUrl).split(',')[1] || ''
    const { data } = await parseBankAPI({ filename: file.name, data_base64: dataBase64 })
    preview.value = data.questions || []
    previewSheets.value = data.sheets || []
    previewName.value = data.suggestName || file.name.replace(/\.xlsx$/i, '')
    previewSource.value = file.name
    previewing.value = true
    ElMessage.success(`已解析 ${preview.value.length} 题，请检查后确认导入`)
  } catch (err) {
    ElMessage.error(adminErrorText(err, '解析失败'))
  } finally {
    parsing.value = false
  }
}

const previewSource = ref('')

function cancelPreview() {
  previewing.value = false
  preview.value = []
  previewSheets.value = []
}

async function confirmImport() {
  if (!preview.value.length) return
  committing.value = true
  try {
    const { data } = await commitBankAPI({
      name: previewName.value,
      source: previewSource.value,
      questions: preview.value
    })
    ElMessage.success(data.message || '导入成功')
    previewing.value = false
    preview.value = []
    await loadAll()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '导入失败'))
  } finally {
    committing.value = false
  }
}

function editPreview(row, idx) {
  previewIndex.value = idx
  dialogMode.value = 'preview'
  fillForm(row)
  dialogVisible.value = true
}

/* ==================== 题库操作 ==================== */
function openCreateBank() {
  ElMessageBox.prompt('给新题库起个名字', '新建题库', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '名称不能为空'
  })
    .then(async (r) => {
      await createBankAPI((r.value || '').trim())
      ElMessage.success('已创建')
      await loadAll()
    })
    .catch(() => {})
}

async function renameBank(row) {
  try {
    const r = await ElMessageBox.prompt('新的题库名称', '重命名题库', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: row.name,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空'
    })
    const name = (r.value || '').trim()
    if (!name || name === row.name) return
    await renameBankAPI(row.id, name)
    ElMessage.success('已重命名')
    await loadAll()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(adminErrorText(e, '重命名失败'))
  }
}

async function removeBank(row) {
  try {
    await ElMessageBox.confirm(`将删除题库「${row.name}」及其 ${row.count} 道题，不可撤销。`, '删除题库', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteBankAPI(row.id)
    ElMessage.success('已删除')
    await loadAll()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '删除失败'))
  }
}

/* ==================== 新增 / 编辑题目 ==================== */
const dialogVisible = ref(false)
const dialogMode = ref('create') // create | edit | preview
const editingRow = ref(null)
const multiCorrect = ref([])

const form = reactive({
  bankId: '',
  no: '',
  type: '单选题',
  title: '',
  options: [],
  correct: '',
  explain: '',
  answer: '',
  difficulty: '基础',
  category: '',
  position: ''
})

const dialogTitle = computed(() =>
  dialogMode.value === 'create' ? '新增题目' : dialogMode.value === 'preview' ? '修改预览中的题目' : '编辑题目'
)

function blankOptions() {
  return ['A', 'B', 'C', 'D'].map((k) => ({ key: k, text: '' }))
}

function fillForm(row) {
  form.bankId = row.bankId || banks.value[0]?.id || ''
  form.no = row.no || ''
  form.type = row.type || '问答题'
  form.title = row.title || ''
  form.options = (row.options || []).map((o) => ({ key: o.key, text: o.text }))
  form.correct = row.correct || ''
  form.explain = row.explain || ''
  form.answer = row.answer || ''
  form.difficulty = row.difficulty || '基础'
  form.category = row.category || ''
  form.position = row.position || ''
  if (OBJECTIVE.includes(form.type) && !form.options.length) form.options = blankOptions()
  multiCorrect.value = form.type === '多选题' ? String(form.correct || '').split('') : []
}

function openCreate() {
  dialogMode.value = 'create'
  editingRow.value = null
  previewIndex.value = -1
  fillForm({ type: '单选题' })
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  editingRow.value = row
  previewIndex.value = -1
  fillForm(row)
  dialogVisible.value = true
}

/** 切题型时把字段准备好：判断固定正确/错误，主观清空选项 */
function onTypeChange(t) {
  if (t === '判断题') {
    form.options = [
      { key: 'A', text: '正确' },
      { key: 'B', text: '错误' }
    ]
    if (!['A', 'B'].includes(form.correct)) form.correct = 'A'
  } else if (t === '问答题') {
    form.options = []
    form.correct = ''
  } else {
    if (!form.options.length || form.type === '多选题') {
      if (form.options.length < 2) form.options = blankOptions()
    }
    if (form.type === '多选题') multiCorrect.value = String(form.correct || '').split('')
  }
}

function addOption() {
  const keys = 'ABCDEF'
  const next = keys[form.options.length] || String(form.options.length + 1)
  form.options.push({ key: next, text: '' })
}

function collectForm() {
  const options = isObjectiveForm.value
    ? form.options.filter((o) => (o.text || '').trim()).map((o) => ({ key: o.key, text: o.text.trim() }))
    : []
  let correct = ''
  if (isObjectiveForm.value) {
    correct =
      form.type === '多选题'
        ? [...multiCorrect.value].sort().join('')
        : form.correct
  }
  return {
    bankId: form.bankId,
    no: form.no,
    type: form.type,
    title: form.title.trim(),
    options,
    correct,
    explain: form.explain.trim(),
    answer: form.answer.trim(),
    difficulty: form.difficulty,
    category: form.category.trim(),
    position: form.position.trim()
  }
}

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('题干不能为空')
    return
  }
  const payload = collectForm()

  // 预览模式下只改本地数据，不调接口
  if (dialogMode.value === 'preview') {
    const idx = previewIndex.value
    if (idx >= 0) {
      const prev = preview.value[idx]
      preview.value[idx] = {
        ...prev,
        ...payload,
        missing: computeMissing(payload)
      }
    }
    dialogVisible.value = false
    return
  }

  const bankId = dialogMode.value === 'edit' ? editingRow.value.bankId : form.bankId
  if (!bankId) {
    ElMessage.warning('请先选择题库')
    return
  }

  saving.value = true
  try {
    if (dialogMode.value === 'edit') {
      await updateQuestionAPI(bankId, editingRow.value.id, payload)
      ElMessage.success('已更新')
    } else {
      await addQuestionAPI(bankId, payload)
      ElMessage.success('已新增')
    }
    dialogVisible.value = false
    await loadAll()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '保存失败'))
  } finally {
    saving.value = false
  }
}

/** 前端预估缺失项，用于预览里即时显示（后端入库时会再算一次） */
function computeMissing(q) {
  const missing = []
  if (OBJECTIVE.includes(q.type)) {
    if ((q.options || []).length < 2) missing.push('选项')
    if (!q.correct) missing.push('正确答案')
    else if (!String(q.correct).split('').every((k) => (q.options || []).some((o) => o.key === k))) {
      missing.push('正确答案')
    }
  } else if (!q.answer) {
    missing.push('参考答案')
  }
  return missing
}

async function removeQuestion(row) {
  try {
    await ElMessageBox.confirm(`删除题目「${row.title.slice(0, 30)}…」？`, '删除题目', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteQuestionAPI(row.bankId, row.id)
    ElMessage.success('已删除')
    await loadAll()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '删除失败'))
  }
}

onMounted(loadAll)
</script>

<style scoped>
.q-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: var(--rad-block);
  background: var(--accent-wash);
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--body-muted);
}
.q-note b {
  color: var(--ink);
}
.q-none {
  color: var(--body-muted);
}
.bad {
  color: var(--danger);
}
.hl {
  color: var(--accent);
}
.q-filters {
  margin-bottom: 12px;
  padding: 4px 14px;
  border-radius: var(--rad-block);
  background: var(--canvas-2);
}
.q-clear-row {
  margin-bottom: 10px;
}
.q-clear {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
}
.q-clear:hover {
  text-decoration: underline;
}
.q-opts-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 11.5px;
  color: var(--body-muted);
}
.q-opt-mini {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.q-pager {
  margin-top: 14px;
  justify-content: flex-end;
}
.q-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.q-opt-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.q-opt-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.q-opt-key {
  flex-shrink: 0;
  width: 20px;
  font-weight: 600;
  color: var(--body-muted);
}
</style>
