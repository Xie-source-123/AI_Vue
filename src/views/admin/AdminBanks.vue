<template>
  <div class="a-page">
    <!-- ===== 题库列表 ===== -->
    <div class="a-card">
      <div class="a-card-head">
        <div>
          <div class="a-card-title">题库管理</div>
          <div class="a-card-sub">
            共 {{ banks.length }} 个题库 · 当前选中《{{ currentBank?.name || '未选择' }}》
            · {{ questions.length }} 道题
          </div>
        </div>
        <div class="a-toolbar">
          <el-button :icon="Refresh" :loading="loading" @click="loadBanks">刷新</el-button>
          <el-button :icon="Plus" @click="openCreateBank">新建空题库</el-button>
          <el-button type="primary" :icon="Upload" :loading="uploading" @click="pickFile">
            上传 Excel
          </el-button>
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx"
            style="display: none"
            @change="onFileChange"
          />
        </div>
      </div>

      <p class="q-note">
        <el-icon :size="13"><InfoFilled /></el-icon>
        上传的 Excel 需要有表头，列名支持：<b>题号 / 题目 / 参考答案 / 难度 / 知识点分类 / 岗位</b>，
        其中<b>题目列必填</b>。一次上传建立一个新题库，原有的不会被覆盖。
      </p>

      <el-table
        v-loading="loading"
        :data="banks"
        size="small"
        highlight-current-row
        empty-text="还没有题库，上传一个 Excel 试试"
        @current-change="onPickBank"
      >
        <el-table-column prop="name" label="题库名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="source" label="来源文件" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="q-none">{{ row.source || '手动创建' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="题数" width="80" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="244" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="manageBank(row)">
              管理题目
            </el-button>
            <el-button link type="primary" size="small" @click.stop="openRename(row)">重命名</el-button>
            <el-button link type="danger" size="small" @click.stop="removeBank(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ===== 题目列表 ===== -->
    <div v-if="currentBank" ref="questionCard" class="a-card">
      <div class="a-card-head">
        <div>
          <div class="a-card-title">{{ currentBank.name }}</div>
          <div class="a-card-sub">共 {{ questions.length }} 题 · 可逐题修改，也可新增</div>
        </div>
        <div class="a-toolbar">
          <el-button type="primary" :icon="Plus" @click="openCreate">新增题目</el-button>
        </div>
      </div>

      <!-- 定位栏：和用户端同一套横向分类标签，替代原来的搜索框 -->
      <div class="q-filters">
        <FilterRow v-model="fCategory" label="知识点" :items="catOptions" :total="questions.length" />
        <FilterRow v-model="fDifficulty" label="难度" :items="diffOptions" :total="questions.length" />
        <FilterRow v-model="fPosition" label="岗位" :items="posOptions" :total="questions.length" />
      </div>

      <el-table v-loading="qLoading" :data="paged" size="small" empty-text="这个题库还没有题目">
        <!-- 展开行：表格里放不下完整题干和参考答案，这里展开看 -->
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="q-expand">
              <div class="q-expand-row">
                <span class="q-expand-lbl">题目</span>
                <p>{{ row.title }}</p>
              </div>
              <div class="q-expand-row">
                <span class="q-expand-lbl">参考答案</span>
                <p>{{ row.answer || '（未填写）' }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="no" label="题号" width="80" />
        <el-table-column prop="title" label="题目" min-width="300" show-overflow-tooltip />
        <el-table-column prop="difficulty" label="难度" width="86" />
        <el-table-column prop="category" label="知识点分类" min-width="150" show-overflow-tooltip />
        <el-table-column prop="position" label="岗位" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="removeQuestion(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="filtered.length > pageSize"
        :total="filtered.length"
        :page-size="pageSize"
        :current-page="page"
        layout="total, prev, pager, next"
        class="q-pager"
        @current-change="(p) => (page = p)"
      />
    </div>

    <!-- ===== 新增 / 编辑题目 ===== -->
    <el-dialog v-model="dialogVisible" :title="editing ? '编辑题目' : '新增题目'" width="620px" append-to-body>
      <el-form :model="form" label-position="top">
        <div class="q-grid">
          <el-form-item label="题号"><el-input v-model="form.no" placeholder="留空则自动编号" /></el-form-item>
          <el-form-item label="难度">
            <el-select v-model="form.difficulty" style="width: 100%">
              <el-option label="基础" value="基础" />
              <el-option label="进阶" value="进阶" />
              <el-option label="真题" value="真题" />
            </el-select>
          </el-form-item>
          <el-form-item label="知识点分类">
            <el-input v-model="form.category" placeholder="如：大数据基础" />
          </el-form-item>
          <el-form-item label="岗位">
            <el-input v-model="form.position" placeholder="如：大数据开发工程师" />
          </el-form-item>
        </div>
        <el-form-item label="题目">
          <el-input v-model="form.title" type="textarea" :rows="2" placeholder="题干内容" />
        </el-form-item>
        <el-form-item label="参考答案">
          <el-input v-model="form.answer" type="textarea" :rows="6" placeholder="评分时对照的参考答案" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 新建 / 重命名题库 ===== -->
    <el-dialog v-model="bankDialogVisible" :title="bankDialogTitle" width="440px" append-to-body>
      <el-form label-position="top">
        <el-form-item :label="bankDialogMode === 'rename' ? '新名称' : '题库名称'">
          <el-input
            v-model="bankNameInput"
            placeholder="例如：大数据开发工程师"
            maxlength="50"
            show-word-limit
            @keyup.enter="submitBankDialog"
          />
        </el-form-item>
      </el-form>
      <p class="q-tip-inline">
        题库名会直接显示在用户端的「岗位」分类里，建议按岗位命名。
      </p>
      <template #footer>
        <el-button @click="bankDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="bankSaving" @click="submitBankDialog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Upload, InfoFilled } from '@element-plus/icons-vue'
import FilterRow from '@/components/blocks/FilterRow.vue'
import {
  fetchBanksAdminAPI,
  uploadBankAPI,
  createBankAPI,
  deleteBankAPI,
  renameBankAPI,
  fetchBankQuestionsAPI,
  addQuestionAPI,
  updateQuestionAPI,
  deleteQuestionAPI,
  adminErrorText
} from '@/api/admin.js'

const banks = ref([])
const currentBank = ref(null)
const questions = ref([])
const loading = ref(false)
const qLoading = ref(false)
const uploading = ref(false)
const saving = ref(false)
const fCategory = ref('')
const fDifficulty = ref('')
const fPosition = ref('')
const questionCard = ref(null)
const page = ref(1)
const pageSize = 20
const fileInput = ref(null)

/* 难度只在显示层映射：Excel 里是基础/进阶/真题，界面上按简单/适中/难展示 */
const DIFF_MAP = { 基础: '简单', 进阶: '适中', 真题: '难' }
const diffLabel = (d) => DIFF_MAP[d] || d || '基础'

const filtered = computed(() => {
  let arr = questions.value
  if (fCategory.value) arr = arr.filter((q) => (q.category || '未分类') === fCategory.value)
  if (fDifficulty.value) arr = arr.filter((q) => diffLabel(q.difficulty) === fDifficulty.value)
  if (fPosition.value) arr = arr.filter((q) => (q.position || '通用') === fPosition.value)
  return arr
})

const catOptions = computed(() => {
  const m = new Map()
  questions.value.forEach((q) => {
    const k = q.category || '未分类'
    m.set(k, (m.get(k) || 0) + 1)
  })
  return [...m.entries()].map(([value, count]) => ({ value, label: value, count }))
})

const diffOptions = computed(() => {
  const m = new Map()
  questions.value.forEach((q) => {
    const k = diffLabel(q.difficulty)
    m.set(k, (m.get(k) || 0) + 1)
  })
  return ['简单', '适中', '难'].filter((d) => m.has(d)).map((d) => ({ value: d, label: d, count: m.get(d) }))
})

const posOptions = computed(() => {
  const m = new Map()
  questions.value.forEach((q) => {
    const k = q.position || '通用'
    m.set(k, (m.get(k) || 0) + 1)
  })
  return [...m.entries()].map(([value, count]) => ({ value, label: value, count }))
})

const paged = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize)
)

async function loadBanks() {
  loading.value = true
  try {
    const { data } = await fetchBanksAdminAPI()
    banks.value = data.banks || []
    // 选中的题库可能被删了，指向第一个
    if (currentBank.value) {
      const still = banks.value.find((b) => b.id === currentBank.value.id)
      currentBank.value = still || banks.value[0] || null
    } else {
      currentBank.value = banks.value[0] || null
    }
    if (currentBank.value) await loadQuestions()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '加载题库失败'))
  } finally {
    loading.value = false
  }
}

async function loadQuestions() {
  if (!currentBank.value) return
  qLoading.value = true
  try {
    const { data } = await fetchBankQuestionsAPI(currentBank.value.id)
    questions.value = data.questions || []
    // 换库后旧的筛选条件多半一条都匹配不上，重置掉
    fCategory.value = ''
    fDifficulty.value = ''
    fPosition.value = ''
    page.value = 1
  } catch (e) {
    ElMessage.error(adminErrorText(e, '加载题目失败'))
  } finally {
    qLoading.value = false
  }
}

/** 点表格行：只切换题库，不滚动 */
function onPickBank(row) {
  if (!row) return
  selectBank(row, false)
}

/** 点「管理题目」：切换 + 滚到题目区。
    之前这里写的是「已经是当前题库就直接 return」，
    所以点当前那行的按钮时毫无反应 —— 看起来就像按钮坏了。 */
function manageBank(row) {
  if (!row) return
  selectBank(row, true)
}

async function selectBank(row, scroll) {
  currentBank.value = row
  await loadQuestions()
  if (scroll) {
    await nextTick()
    questionCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

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
  uploading.value = true
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = reject
      r.readAsDataURL(file)
    })
    const dataBase64 = String(dataUrl).split(',')[1] || ''
    const { data } = await uploadBankAPI({
      name: file.name.replace(/\.xlsx$/i, ''),
      filename: file.name,
      dataBase64
    })
    ElMessage.success(data.message || '导入成功')
    await loadBanks()
    const created = banks.value.find((b) => b.id === data.bank?.id)
    if (created) onPickBank(created)
  } catch (e) {
    ElMessage.error(adminErrorText(e, '上传失败'))
  } finally {
    uploading.value = false
  }
}

/* ===== 新建 / 重命名题库 =====
   刻意不用 ElMessageBox.prompt：这个项目的弹窗被全局改成了卡片材质
   （毛玻璃 + 渐变底），message-box 的输入框在这种材质下容易看不出边界，
   用户会以为「点了没反应」。改用和「新增题目」同一个 el-dialog，所见即所得。 */
const bankDialogVisible = ref(false)
const bankDialogMode = ref('create') // create | rename
const bankDialogTarget = ref(null)
const bankNameInput = ref('')
const bankSaving = ref(false)

const bankDialogTitle = computed(() =>
  bankDialogMode.value === 'rename' ? '重命名题库' : '新建空题库'
)

function openCreateBank() {
  bankDialogMode.value = 'create'
  bankDialogTarget.value = null
  bankNameInput.value = ''
  bankDialogVisible.value = true
}

function openRename(row) {
  bankDialogMode.value = 'rename'
  bankDialogTarget.value = row
  bankNameInput.value = row.name || ''
  bankDialogVisible.value = true
}

async function submitBankDialog() {
  const name = (bankNameInput.value || '').trim()
  if (!name) {
    ElMessage.warning('名称不能为空')
    return
  }
  if (bankDialogMode.value === 'rename' && name === bankDialogTarget.value?.name) {
    bankDialogVisible.value = false
    return
  }
  bankSaving.value = true
  try {
    if (bankDialogMode.value === 'rename') {
      await renameBankAPI(bankDialogTarget.value.id, name)
      ElMessage.success('已重命名')
    } else {
      await createBankAPI(name)
      ElMessage.success('已创建')
    }
    bankDialogVisible.value = false
    await loadBanks()
  } catch (e) {
    ElMessage.error(adminErrorText(e, bankDialogMode.value === 'rename' ? '重命名失败' : '创建失败'))
  } finally {
    bankSaving.value = false
  }
}

async function removeBank(row) {
  try {
    await ElMessageBox.confirm(
      `将删除题库「${row.name}」及其 ${row.count} 道题，不可撤销。`,
      '删除题库',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await deleteBankAPI(row.id)
    ElMessage.success('已删除')
    if (currentBank.value?.id === row.id) currentBank.value = null
    await loadBanks()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '删除失败'))
  }
}

/* ===== 新增 / 编辑 ===== */
const dialogVisible = ref(false)
const editing = ref(null)
const form = reactive({ no: '', title: '', answer: '', difficulty: '基础', category: '', position: '' })

function resetForm() {
  Object.assign(form, { no: '', title: '', answer: '', difficulty: '基础', category: '', position: '' })
}

function openCreate() {
  editing.value = null
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  Object.assign(form, {
    no: row.no || '',
    title: row.title || '',
    answer: row.answer || '',
    difficulty: row.difficulty || '基础',
    category: row.category || '',
    position: row.position || ''
  })
  dialogVisible.value = true
}

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('题目不能为空')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await updateQuestionAPI(currentBank.value.id, editing.value.id, { ...form })
      ElMessage.success('已更新')
    } else {
      await addQuestionAPI(currentBank.value.id, { ...form })
      ElMessage.success('已新增')
    }
    dialogVisible.value = false
    await loadQuestions()
    await loadBanks()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '保存失败'))
  } finally {
    saving.value = false
  }
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
    await deleteQuestionAPI(currentBank.value.id, row.id)
    ElMessage.success('已删除')
    await loadQuestions()
    await loadBanks()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '删除失败'))
  }
}

onMounted(loadBanks)
</script>

<style scoped>
.q-note {
  margin: 0 0 14px;
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--body-muted);
  border-radius: var(--rad-block);
  background: var(--accent-wash);
}
.q-note b {
  color: var(--ink);
}
.q-none {
  color: var(--body-muted);
}
.q-tip-inline {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--body-muted);
}
/* 定位栏：和用户端题库练习同一套横向分类标签 */
.q-filters {
  margin-bottom: 14px;
  padding: 4px 14px;
  border-radius: var(--rad-block);
  background: var(--canvas-2);
}
.q-expand {
  padding: 10px 16px 10px 52px;
}
.q-expand-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 0;
}
.q-expand-lbl {
  flex-shrink: 0;
  width: 60px;
  font-size: 12px;
  color: var(--body-muted);
}
.q-expand-row p {
  margin: 0;
  flex: 1;
  font-size: 12.5px;
  line-height: 1.9;
  color: var(--body);
  white-space: pre-wrap;
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
</style>
