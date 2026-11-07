<template>
  <!-- ===== 第一行：身份横幅（整宽） ===== -->
  <section class="card span-3 pf-banner">
    <div class="pf-ident">
      <div class="pf-avatar">
        <img v-if="avatarData" :src="avatarData" alt="" />
        <template v-else>{{ initial }}</template>
      </div>
      <div class="pf-meta">
        <span class="pf-name">{{ username }}</span>
        <span class="pf-role">{{ isGuest ? '访客账号' : '正式账号' }}</span>
        <button
          class="avatar-btn press-md focus-ring"
          :disabled="avatarLoading"
          @click="pickAvatar"
        >
          {{ avatarLoading ? '处理中…' : '更换头像' }}
        </button>
      </div>
    </div>

    <!-- 隐藏的文件选择器：由「更换头像」按钮触发 -->
    <input
      ref="avatarInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onAvatarChange"
    />

    <dl class="pf-stats">
      <div class="pf-stat">
        <dt>面试记录</dt>
        <dd>{{ counts.records }}</dd>
      </div>
      <div class="pf-stat">
        <dt>简历</dt>
        <dd>{{ counts.resumes }}</dd>
      </div>
    </dl>
  </section>

  <!-- ===== 第二行：资料表单 2 列 + 已保存档案 1 列 ===== -->
  <section class="card span-2 pf-form">
    <span class="tech-section">上传 / 编辑资料</span>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="left"
      label-width="76px"
      class="pf-form-body"
    >
      <div class="pf-fields">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" :prefix-icon="User" />
        </el-form-item>

        <el-form-item label="年龄" prop="age">
          <el-input-number
            v-model="form.age"
            :min="16"
            :max="65"
            placeholder="请输入年龄"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-select v-model="form.gender" placeholder="请选择性别" style="width: 100%">
            <el-option label="男" value="男" />
            <el-option label="女" value="女" />
          </el-select>
        </el-form-item>

        <el-form-item label="目标岗位" prop="targetPosition">
          <el-select v-model="form.targetPosition" placeholder="请选择目标岗位" style="width: 100%">
            <el-option v-for="p in positionOptions" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="学历" prop="education" class="pf-full">
          <el-select v-model="form.education" placeholder="请选择学历" style="width: 100%">
            <el-option label="高中" value="高中" />
            <el-option label="大专" value="大专" />
            <el-option label="本科" value="本科" />
            <el-option label="硕士" value="硕士" />
            <el-option label="博士" value="博士" />
          </el-select>
        </el-form-item>
      </div>

      <div class="pf-actions">
        <el-button type="primary" class="pf-submit" @click="handleSubmit">保存资料</el-button>
        <el-button class="pf-reset" @click="handleReset">重置</el-button>
      </div>
    </el-form>
  </section>

  <section class="card pf-saved">
    <span class="tech-section">已保存档案</span>

    <div v-if="savedProfile" class="pf-saved-list">
      <div class="pf-saved-row">
        <span class="pf-saved-label">姓名</span>
        <span class="pf-saved-value">{{ savedProfile.name || '—' }}</span>
      </div>
      <div class="pf-saved-row">
        <span class="pf-saved-label">年龄</span>
        <span class="pf-saved-value">{{ savedProfile.age || '—' }}</span>
      </div>
      <div class="pf-saved-row">
        <span class="pf-saved-label">性别</span>
        <span class="pf-saved-value">{{ savedProfile.gender || '—' }}</span>
      </div>
      <div class="pf-saved-row">
        <span class="pf-saved-label">目标岗位</span>
        <span class="pf-saved-value">{{ savedProfile.targetPosition || '—' }}</span>
      </div>
      <div class="pf-saved-row">
        <span class="pf-saved-label">学历</span>
        <span class="pf-saved-value">{{ savedProfile.education || '—' }}</span>
      </div>
    </div>

    <p v-else class="pf-empty">还没有保存过档案，填好左侧表单后保存。</p>
  </section>

  <!-- ===== 界面配色（个人化，只影响当前账号） ===== -->
  <section class="card span-3">
    <span class="tech-section">界面配色</span>
    <ThemePicker />
  </section>

  <!-- ===== 第三行：工作台快捷（整宽） ===== -->
  <section class="card span-3 pf-links">
    <span class="tech-section">工作台</span>
    <div class="pf-link-grid">
      <button v-for="w in WORKSPACES" :key="w.key" class="pf-link press-lg focus-ring" @click="go(w.path)">
        <span class="pf-link-title">{{ w.title }}</span>
        <span class="pf-link-sub">{{ w.groups.flatMap((g) => g.items).length }} 个模块</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import ThemePicker from '@/components/ThemePicker.vue'
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { WORKSPACES } from '@/theme/workspace.js'
import { getUserItem, setUserItem } from '@/utils/userStorage.js'
import { avatar, reloadAvatar, saveAvatar, fileToAvatar } from '@/utils/avatar.js'

const router = useRouter()
const formRef = ref(null)
const savedProfile = ref(null)

/* 头像：与侧边栏、偏好设置账户卡共用同一个响应式 ref */
const avatarData = avatar
const avatarLoading = ref(false)
const avatarInput = ref(null)

const pickAvatar = () => avatarInput.value?.click()

const onAvatarChange = async (e) => {
  const file = e.target.files?.[0]
  /* 先清空 value，否则连选同一个文件不会触发 change */
  e.target.value = ''
  if (!file) return

  avatarLoading.value = true
  try {
    const dataUrl = await fileToAvatar(file)
    saveAvatar(dataUrl)
    ElMessage.success('头像已更新')
  } catch (err) {
    ElMessage.error(err.message || '头像更新失败')
  } finally {
    avatarLoading.value = false
  }
}

const username = ref('用户')
const isGuest = ref(false)
const counts = ref({ records: 0, resumes: 0 })

const initial = computed(() => (username.value ? username.value.charAt(0).toUpperCase() : 'U'))

const positionOptions = [
  { label: '数据开发工程师', value: '数据开发工程师' },
  { label: 'Linux服务器工程师', value: 'Linux服务器工程师' }
]

const form = reactive({
  name: '',
  age: undefined,
  gender: '',
  targetPosition: '',
  education: ''
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  age: [{ required: true, message: '请选择年龄', trigger: 'change' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  targetPosition: [{ required: true, message: '请选择目标岗位', trigger: 'change' }],
  education: [{ required: true, message: '请选择学历', trigger: 'change' }]
}

const len = (key) => {
  try {
    return JSON.parse(getUserItem(key) || '[]').length
  } catch {
    return 0
  }
}

const loadSaved = () => {
  try {
    const raw = getUserItem('profile')
    savedProfile.value = raw ? JSON.parse(raw) : null
  } catch {
    savedProfile.value = null
  }
}

const fillForm = () => {
  const p = savedProfile.value
  if (!p) return
  form.name = p.name || ''
  form.age = p.age ?? undefined
  form.gender = p.gender || ''
  form.targetPosition = p.targetPosition || ''
  form.education = p.education || ''
}

onMounted(() => {
  username.value = localStorage.getItem('username') || '用户'
  isGuest.value = localStorage.getItem('guest_mode') === 'true'
  counts.value = {
    records: len('interview_records'),
    resumes: len('saved_resumes') + len('uploaded_files')
  }
  reloadAvatar()
  loadSaved()
  fillForm()
})

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  setUserItem('profile', JSON.stringify({ ...form }))
  loadSaved()
  ElMessage.success('个人信息保存成功')
}

const handleReset = () => {
  formRef.value.resetFields()
  form.age = undefined
  ElMessage.info('表单内容已清空')
}

const go = (path) => router.push(path)
</script>

<style scoped>
/* 溶解包裹层：自身不参与布局，让内部卡片直接成为 .split-2-1 的网格项 */
.pf-banner,
.pf-form,
.pf-saved,
.pf-links {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ===== 身份横幅 ===== */
.pf-banner {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.pf-ident {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
/* 上传的头像裁成圆形填满，否则方图会溢出圆形边框 */
.pf-avatar img {
  /* 同 acct-avatar：绝对定位填满，尺寸由父容器决定，不会溢出或偏移。 */
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.avatar-btn {
  margin-top: 8px;
  align-self: flex-start;
  padding: 5px 14px;
  background: transparent;
  border: 1px solid var(--accent-line);
  border-radius: var(--rad-pill);
  color: var(--accent-hover);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}

.avatar-btn:hover:not(:disabled) {
  background: var(--accent-wash);
  border-color: var(--accent);
}

.avatar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pf-avatar {
  /* 定位上下文 + 圆形硬裁剪，同 acct-avatar。 */
  position: relative;
  overflow: hidden;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--canvas);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 19px;
  font-weight: 700;
  flex-shrink: 0;
}
.pf-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.pf-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: var(--track-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pf-role {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--body-muted);
}
.pf-stats {
  display: flex;
  align-items: stretch;
  gap: 0;
}
.pf-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 22px;
  border-left: 1px solid var(--hairline);
}
.pf-stat:first-child {
  border-left: none;
}
.pf-stat dt {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--body-muted);
}
.pf-stat dd {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1.1;
}

/* ===== 表单 ===== */
.pf-form-body {
  margin-top: 2px;
}
.pf-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 22px;
}
.pf-full {
  grid-column: 1 / -1;
}
.pf-actions {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  padding-top: 18px;
  border-top: 1px solid var(--hairline);
}
.pf-submit,
.pf-reset {
  min-width: 112px;
}

/* ===== 已保存档案 ===== */
.pf-saved-list {
  display: flex;
  flex-direction: column;
}
.pf-saved-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid var(--hairline);
}
.pf-saved-row:last-child {
  border-bottom: none;
}
.pf-saved-label {
  font-size: 12px;
  color: var(--body-muted);
  flex-shrink: 0;
}
.pf-saved-value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pf-empty {
  padding: 20px 0;
  font-size: 12px;
  color: var(--body-muted);
  line-height: 1.7;
}

/* ===== 工作台快捷 ===== */
.pf-link-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.pf-link {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px 18px;
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
  border: 1px solid var(--hairline);
  border-radius: var(--rad-block);
  text-align: left;
  cursor: pointer;
  transition: var(--slide-trans);
}
.pf-link:hover {
  border-color: var(--accent);
  transform: translateX(3px);
}
.pf-link-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}
.pf-link-sub {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
  color: var(--body-muted);
}

@media (max-width: 1100px) {
  .pf-fields,
  .pf-link-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .pf-full {
    grid-column: auto;
  }
}
@media (max-width: 700px) {
  .pf-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .pf-stats {
    width: 100%;
  }
  .pf-stat:first-child {
    padding-left: 0;
  }
}
</style>
