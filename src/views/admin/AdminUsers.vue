<template>
  <div class="a-page">
    <div class="a-card">
      <div class="a-card-head">
        <div>
          <div class="a-card-title">账号列表</div>
          <div class="a-card-sub">
            共 {{ total }} 个账号 · 管理员 {{ admins }} · 已禁用 {{ disabled }}
            <span v-if="me">· 标「当前登录」的是你自己，不可禁用或删除</span>
          </div>
        </div>
        <div class="a-toolbar">
          <el-input
            v-model="keyword"
            placeholder="搜索账号…"
            :prefix-icon="Search"
            clearable
            style="width: 200px"
          />
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="filtered"
        :row-class-name="rowClass"
        size="small"
        empty-text="没有匹配的账号"
      >
        <el-table-column prop="username" label="账号" min-width="186">
          <template #default="{ row }">
            <span class="u-name">{{ row.username }}</span>
            <el-tag v-if="isMe(row)" size="small" effect="light" class="u-me">当前登录</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="108">
          <template #default="{ row }">
            <el-tag v-if="row.role === 'admin'" type="warning" size="small" effect="light">管理员</el-tag>
            <el-tag v-else size="small" effect="plain">普通用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="104">
          <template #default="{ row }">
            <span class="u-state">
              <span class="a-dot" :class="row.enabled ? 'ok' : 'bad'" />
              {{ row.enabled ? '正常' : '已禁用' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="密码存储" width="126">
          <template #default="{ row }">
            <span :class="['u-store', { weak: !row.hashed }]">
              {{ row.hashed ? 'PBKDF2 哈希' : '明文（待升级）' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" min-width="170" />
        <el-table-column label="操作" width="212" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openReset(row)">重置密码</el-button>
            <el-button
              link
              :type="row.enabled ? 'warning' : 'success'"
              size="small"
              :disabled="isMe(row)"
              @click="toggle(row)"
            >
              {{ row.enabled ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" :disabled="isMe(row)" @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ===== 重置密码 ===== -->
    <el-dialog v-model="resetVisible" title="重置密码" width="400px" append-to-body>
      <p class="d-tip">
        将为账号 <b>{{ resetTarget?.username }}</b> 生成新的密码哈希。
        旧密码立即失效，原密码不可找回。
      </p>
      <el-form ref="resetFormRef" :model="resetForm" :rules="resetRules" label-position="top">
        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="resetForm.password"
            type="password"
            placeholder="至少 8 位，仅限英文字母和数字且两者都要有"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirm">
          <el-input
            v-model="resetForm.confirm"
            type="password"
            placeholder="请再次输入"
            show-password
            @keyup.enter="submitReset"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import {
  fetchUsersAPI,
  toggleUserAPI,
  resetUserPasswordAPI,
  deleteUserAPI,
  adminErrorText
} from '@/api/admin.js'
import { getAdminName } from '@/utils/adminSession.js'

/* 本次登录的后台账号。
   取自 adminSession 的 admin_username（管理员登录时写入），和后端
   /api/admin/users 返回的 username 是同一套键值，直接比字符串即可。
   用普通 const 不用 ref：进后台的这个账号在页面生命周期内不会变，
   真要换账号是重新登录、整个组件重建。
   注：前端这份只负责【显示】，不代表权限 —— 能不能禁用谁，最终由后端定。 */
const me = getAdminName()
const isMe = (row) => !!me && row.username === me
/* el-table 的 row-class-name 回调，签名固定为 { row, rowIndex } */
const rowClass = ({ row }) => (isMe(row) ? 'u-row-me' : '')

const loading = ref(false)
const submitting = ref(false)
const users = ref([])
const total = ref(0)
const admins = ref(0)
const disabled = ref(0)
const keyword = ref('')

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return users.value
  return users.value.filter((u) => u.username.toLowerCase().includes(k))
})

async function load() {
  loading.value = true
  try {
    const { data } = await fetchUsersAPI()
    users.value = data.users || []
    total.value = data.total || 0
    admins.value = data.admins || 0
    disabled.value = data.disabled || 0
  } catch (e) {
    ElMessage.error(adminErrorText(e, '加载账号列表失败'))
  } finally {
    loading.value = false
  }
}

async function toggle(row) {
  const next = !row.enabled
  try {
    await ElMessageBox.confirm(
      next
        ? `确认启用「${row.username}」？启用后该账号可以正常登录。`
        : `确认禁用「${row.username}」？禁用后该账号【立即无法登录】，包括已经打开的会话下次请求就会被拒。`,
      next ? '启用账号' : '禁用账号',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: next ? 'info' : 'warning' }
    )
  } catch {
    return
  }
  try {
    await toggleUserAPI(row.username, next)
    ElMessage.success(`已${next ? '启用' : '禁用'} ${row.username}`)
    load()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '操作失败'))
  }
}

/* ===== 重置密码 ===== */
const resetVisible = ref(false)
const resetTarget = ref(null)
const resetFormRef = ref(null)
const resetForm = ref({ password: '', confirm: '' })

/* 与后端 check_password_policy 保持同一套规则：≥8 位、只能是英文字母和数字、
   且两类都要有。前端这份是「提前告诉用户哪里不对」，后端那份才是真正的约束 ——
   绕过界面直接打接口同样会被挡。 */
const resetRules = {
  password: [
    {
      validator: (_r, v, cb) => {
        if (!v) return cb(new Error('请输入新密码'))
        if (v.length < 8) return cb(new Error('密码长度不能少于 8 位'))
        if (!/^[A-Za-z0-9]+$/.test(v))
          return cb(new Error('密码只能由英文字母和数字组成，不能包含其他字符'))
        if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return cb(new Error('密码必须同时包含字母和数字'))
        cb()
      },
      trigger: 'blur'
    }
  ],
  confirm: [
    {
      validator: (_r, v, cb) => {
        if (v !== resetForm.value.password) return cb(new Error('两次输入的密码不一致'))
        cb()
      },
      trigger: 'blur'
    }
  ]
}

function openReset(row) {
  resetTarget.value = row
  resetForm.value = { password: '', confirm: '' }
  resetVisible.value = true
}

async function submitReset() {
  const valid = await resetFormRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await resetUserPasswordAPI(resetTarget.value.username, resetForm.value.password)
    ElMessage.success(`已重置 ${resetTarget.value.username} 的密码`)
    resetVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '重置失败'))
  } finally {
    submitting.value = false
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `将永久删除账号「${row.username}」。该操作不可撤销。\n` +
        '注意：只删服务端的登录账号，该用户浏览器里已有的面试记录不受影响。',
      '删除账号',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' }
    )
  } catch {
    return
  }
  try {
    await deleteUserAPI(row.username)
    ElMessage.success(`已删除 ${row.username}`)
    load()
  } catch (e) {
    ElMessage.error(adminErrorText(e, '删除失败'))
  }
}

onMounted(load)
</script>

<style scoped>
.u-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--body);
}
.u-store {
  font-size: 12px;
  color: var(--body-muted);
}
/* 明文存储要显眼一点：这是要尽快修掉的状态，不该和哈希长得一样 */
.u-store.weak {
  color: var(--warn);
}
.u-name {
  font-size: 13px;
  color: var(--ink);
}
/* 「当前登录」和旁边的「管理员」是同一种东西 —— 都是身份标签，
   所以沿用同一套 el-tag 语言，只在类型上拉开：管理员是 warning，
   自己是 el-tag 默认的 primary（在本工作台就是主题强调色），
   「哪个是权限、哪个是我」一眼分得清。 */
.u-me {
  margin-left: 6px;
  vertical-align: middle;
}
.d-tip {
  margin-bottom: 16px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--body-muted);
}
.d-tip b {
  color: var(--ink);
}
</style>
