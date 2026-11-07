<template>
  <div class="a-page">
    <div class="a-card">
      <div class="a-card-head">
        <div>
          <div class="a-card-title">岗位列表</div>
          <div class="a-card-sub">
            这里改完，面试工作台的「选择面试岗位」立刻跟着变 ——
            它们读的是同一个 <code>/api/positions</code> 接口
          </div>
        </div>
        <div class="a-toolbar">
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">新增岗位</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="positions" size="small" empty-text="还没有岗位">
        <el-table-column label="图标" width="72" align="center">
          <template #default="{ row }">
            <span class="p-icon">{{ row.icon || '◆' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="岗位名称" min-width="180" />
        <el-table-column prop="label" label="显示名" min-width="170" />
        <el-table-column prop="desc" label="说明" min-width="240" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑岗位' : '新增岗位'"
      width="440px"
      append-to-body
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="岗位名称" prop="value">
          <el-input v-model="form.value" placeholder="例如：数据开发工程师" />
        </el-form-item>
        <el-form-item label="图标字符" prop="icon">
          <el-input v-model="form.icon" placeholder="随便一个单字符，例如 ▦ ⌘ ◫ ◍ ◆" maxlength="2" />
        </el-form-item>
        <el-form-item label="说明" prop="desc">
          <el-input
            v-model="form.desc"
            type="textarea"
            :rows="2"
            placeholder="一句话描述这个岗位考什么，会显示在岗位卡片上"
          />
        </el-form-item>
      </el-form>
      <p class="d-tip">
        改名要注意：已选过这个岗位的用户，本地存的是旧名称，
        <b>不会自动跟着变</b>，需要在面试工作台重新选一次。
      </p>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">
          {{ editing ? '保存' : '新增' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import {
  fetchPositionsAPI,
  createPositionAPI,
  updatePositionAPI,
  deletePositionAPI,
  adminErrorText
} from '@/api/admin.js'

const loading = ref(false)
const submitting = ref(false)
const positions = ref([])

const dialogVisible = ref(false)
const editing = ref(false)
const original = ref('')
const formRef = ref(null)
const form = ref({ value: '', label: '', desc: '', icon: '◆' })

const rules = {
  value: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    const { data } = await fetchPositionsAPI()
    positions.value = data.positions || []
  } catch (e) {
    ElMessage.error(adminErrorText(e, '加载岗位失败'))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = false
  original.value = ''
  form.value = { value: '', label: '', desc: '', icon: '◆' }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = true
  original.value = row.value
  form.value = { value: row.value, label: row.label || row.value, desc: row.desc || '', icon: row.icon || '◆' }
  dialogVisible.value = true
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload = {
    // label 留空时后端会回落到 value，所以这里不强制填
    value: form.value.value.trim(),
    label: (form.value.label || form.value.value).trim(),
    desc: (form.value.desc || '').trim(),
    icon: (form.value.icon || '◆').trim()
  }

  submitting.value = true
  try {
    if (editing.value) await updatePositionAPI(original.value, payload)
    else await createPositionAPI(payload)
    ElMessage.success(editing.value ? '已保存' : '已新增')
    dialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '保存失败'))
  } finally {
    submitting.value = false
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除岗位「${row.value}」？删除后该岗位不再出现在面试工作台的可选列表里。`,
      '删除岗位',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await deletePositionAPI(row.value)
    ElMessage.success('已删除')
    load()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '删除失败'))
  }
}

onMounted(load)
</script>

<style scoped>
.p-icon {
  font-size: 17px;
  color: var(--accent);
}
.d-tip {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--body-muted);
}
.d-tip b {
  color: var(--warn);
}
</style>
