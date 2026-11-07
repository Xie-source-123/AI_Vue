<template>
  <Teleport to="body">
    <Transition name="auth-fade">
      <div v-if="visible" class="auth-overlay" @click.self="close">
        <div class="auth-modal" role="dialog" aria-modal="true" aria-label="登录注册">
          <button class="auth-close press-sm focus-ring" aria-label="关闭" @click="close">
            <el-icon :size="18"><Close /></el-icon>
          </button>

          <!-- 品牌 + 切换 -->
          <div class="auth-head">
            <div class="auth-logo">
              <span class="auth-logo-mark" aria-hidden="true" />
              <span class="auth-logo-text">节点 <em>NODE</em></span>
            </div>
            <!-- 管理员态下不再显示「登录/注册」两个 tab：
                 此时入口已经被换掉了，留着会让人以为还能点回去，
                 也会把「这是管理员通道」这件事说糊。 -->
            <div v-if="!isAdmin" class="auth-tabs">
              <button class="press-md focus-ring" :class="{ active: mode === 'login' }" @click="onLoginTabClick">
                登录
              </button>
              <button class="press-md focus-ring" :class="{ active: mode === 'register' }" @click="switchMode('register')">
                注册
              </button>
            </div>
            <span v-else class="admin-badge">
              <el-icon :size="12"><Lock /></el-icon>
              管理员通道
            </span>
          </div>

          <!-- 管理员登录表单：三击「登录」后出现 -->
          <el-form
            v-if="isAdmin"
            ref="adminFormRef"
            :model="adminForm"
            :rules="adminRules"
            label-position="top"
            class="auth-form"
          >
            <el-form-item label="管理员账号" prop="username">
              <el-input
                v-model="adminForm.username"
                placeholder="请输入管理员账号"
                :prefix-icon="User"
                size="large"
                autocomplete="off"
              />
            </el-form-item>
            <el-form-item label="管理密码" prop="password">
              <el-input
                v-model="adminForm.password"
                type="password"
                placeholder="请输入管理密码"
                :prefix-icon="Lock"
                size="large"
                show-password
                autocomplete="off"
                @keyup.enter="handleAdminLogin"
              />
            </el-form-item>
            <el-button type="primary" size="large" class="auth-submit" :loading="loading" @click="handleAdminLogin">
              进入管理后台
            </el-button>
            <button type="button" class="admin-back press-md focus-ring" @click="exitAdminMode">
              返回普通登录
            </button>
          </el-form>

          <!-- 登录表单 -->
          <el-form
            v-else-if="mode === 'login'"
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            label-position="top"
            class="auth-form"
          >
            <el-form-item label="用户名" prop="username">
              <el-input v-model="loginForm.username" placeholder="请输入用户名" :prefix-icon="User" size="large" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-button type="primary" size="large" class="auth-submit" :loading="loading" @click="handleLogin">
              登录
            </el-button>
          </el-form>

          <!-- 注册表单 -->
          <el-form
            v-else
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            label-position="top"
            class="auth-form"
          >
            <el-form-item label="用户名" prop="username">
              <el-input v-model="registerForm.username" placeholder="请输入用户名" :prefix-icon="User" size="large" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                size="large"
                show-password
              />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                :prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="handleRegister"
              />
            </el-form-item>
            <el-button type="primary" size="large" class="auth-submit" :loading="loading" @click="handleRegister">
              注册
            </el-button>
          </el-form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Close } from '@element-plus/icons-vue'
import { loginAPI, registerAPI } from '@/api/index'
import { adminLoginAPI, adminErrorText } from '@/api/admin.js'
import { setAdminSession } from '@/utils/adminSession.js'
/* 品牌图形由 CSS 的 mask 引用（见 .auth-logo-mark），不需要 import */

const props = defineProps({
  visible: { type: Boolean, default: false },
  initialMode: { type: String, default: 'login' }
})
const emit = defineEmits(['update:visible'])

const router = useRouter()
const mode = ref(props.initialMode)
const loading = ref(false)

const loginFormRef = ref(null)
const registerFormRef = ref(null)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', password: '', confirmPassword: '' })

/* ===== 管理员通道 =====
   唤起方式：在弹窗里对「登录」这个 tab 连点三下。
   刻意不做成按钮/链接 —— 它不需要被普通用户发现，也不该占用界面位置。

   说清楚一点：这只是「把入口藏起来」，不是权限控制。
   谁都能按 F12 看到管理接口的地址，所以真正的闸门是后端的 require_admin，
   前端这里做不做手势，安全性都不变。 */
const ADMIN_CLICK_WINDOW = 800 // 三击之间的最大间隔（毫秒）
const ADMIN_CLICKS_NEEDED = 3
let loginTabClicks = []

const isAdmin = ref(false)
const adminFormRef = ref(null)
const adminForm = reactive({ username: '', password: '' })

const adminRules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入管理密码', trigger: 'blur' }]
}

/* 登录和注册【共用】这一份校验 —— 是刻意保留的：需求方要求登录也按同一规则拦。
   副作用要知道：密码不合规的【既有账号】会连登录表单都提交不出去（表单在
   发请求之前就被 element-plus 拦下了，后端根本没机会说话）。
   目前 小明 的密码是 6 位，就属于这种情况。
   将来若想放开，只需把 loginRules.password 换回 [{ required: true, ... }]，
   注册那份不动即可 —— 规则本来就该只管「设置密码」。

  规则与后端 check_password_policy 完全一致：≥8 位、只能是英文字母和数字、
  且两类都要有。前端这份是体验，后端那份才是约束。 */
const validatePassword = (_rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'))
    return
  }
  if (value.length < 8) {
    callback(new Error('密码长度不能少于 8 位'))
    return
  }
  if (!/^[A-Za-z0-9]+$/.test(value)) {
    callback(new Error('密码只能由英文字母和数字组成，不能包含其他字符'))
    return
  }
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
    callback(new Error('密码必须同时包含字母和数字'))
    return
  }
  callback()
}

const validateConfirm = (_rule, value, callback) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }]
}

const registerRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const close = () => emit('update:visible', false)

const switchMode = (m) => {
  mode.value = m
  loginFormRef.value?.clearValidate()
  registerFormRef.value?.clearValidate()
}

/* 「登录」tab 的点击处理：先记时间戳，攒够三次就切管理员通道，否则照常切 tab。

   为什么用「时间戳 + 窗口」而不是计数器：
   计数器需要额外定时器归零，而且用户点两下、过一会儿再点一下也会凑够三次；
   时间戳判定只认「密集连续的三下」，更符合双击/三击这类手势的直觉。 */
function onLoginTabClick() {
  const now = Date.now()
  loginTabClicks = loginTabClicks.filter((t) => now - t < ADMIN_CLICK_WINDOW)
  loginTabClicks.push(now)

  if (loginTabClicks.length >= ADMIN_CLICKS_NEEDED) {
    loginTabClicks = []
    enterAdminMode()
    return
  }
  switchMode('login')
}

function enterAdminMode() {
  isAdmin.value = true
  mode.value = 'login'
  adminForm.username = ''
  adminForm.password = ''
  nextTick(() => adminFormRef.value?.clearValidate())
}

function exitAdminMode() {
  isAdmin.value = false
  adminForm.username = ''
  adminForm.password = ''
  adminFormRef.value?.clearValidate()
}

watch(() => props.visible, (v) => {
  if (v) {
    mode.value = props.initialMode
    /* 每次重新打开都退回普通登录。
       不重置的话，只要有人进过一次管理态，之后所有人在这个浏览器里
       点「登录」看到的都会是管理员表单 —— 等于把入口直接暴露出去。 */
    isAdmin.value = false
    loginTabClicks = []
  }
})

const handleLogin = async () => {
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const { data } = await loginAPI(loginForm.username, loginForm.password)
    if (data.error) {
      ElMessage.error(data.error)
      return
    }
    localStorage.setItem('token', data.token || '')
    localStorage.setItem('username', data.username || loginForm.username)
    ElMessage.success(data.message || '登录成功')
    close()
    router.push('/app/dashboard')
  } catch (err) {
    const msg = err.response?.data?.error || err.response?.data?.detail || '登录失败，请检查后端服务是否启动'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const { data } = await registerAPI(registerForm.username, registerForm.password)
    if (data.error) {
      ElMessage.error(data.error)
      return
    }
    ElMessage.success(data.message || '注册成功，请登录')
    loginForm.username = registerForm.username
    registerForm.username = ''
    registerForm.password = ''
    registerForm.confirmPassword = ''
    mode.value = 'login'
  } catch (err) {
    const msg = err.response?.data?.error || err.response?.data?.detail || '注册失败，请检查后端服务是否启动'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

/* 管理员登录。
   和普通登录走完全不同的接口（/api/auth/admin-login），
   后端那边额外校验 role —— 所以拿普通账号在这里登录一定会被拒。 */
const handleAdminLogin = async () => {
  const valid = await adminFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const { data } = await adminLoginAPI(adminForm.username.trim(), adminForm.password)
    if (data.error) {
      ElMessage.error(data.error)
      return
    }
    setAdminSession(data.token, data.username)
    ElMessage.success('已进入管理后台')
    close()
    router.push('/admin')
  } catch (err) {
    ElMessage.error(adminErrorText(err, '管理员登录失败，请检查后端服务是否启动'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ===== 遮罩 ===== */
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  /* 遮罩加强：模糊 10→20，蒙层加深，与弹窗的强玻璃语言配套 */
  background: rgba(20, 51, 43, 0.66);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}

/* ===== 毛玻璃大圆角弹窗（立体感） ===== */
.auth-modal {
  position: relative;
  width: 440px;
  max-width: 100%;
  padding: 34px 32px 32px;
  border-radius: 28px;
  background: linear-gradient(160deg, rgba(20, 51, 43, 0.72), var(--surface-glass));
  border: 1px solid var(--hairline);
  backdrop-filter: blur(34px) saturate(180%);
  -webkit-backdrop-filter: blur(34px) saturate(180%);
  box-shadow:
    0 48px 96px rgba(20, 51, 43, 0.20),
    0 16px 32px rgba(20, 51, 43, 0.14),
    inset 0 1px 0 var(--sheen),
    inset 0 18px 36px -26px var(--sheen);
}

.auth-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--hairline);
  /* 强柔光玻璃圆钮 + 令牌化图标色。
     原来用 rgba(255,255,255,0.7) 硬编码白色：浅色主题下白图标压在
     浅玻璃面上对比度不足。--ink-muted-80 两套主题均有定义，自动适配。 */
  background: var(--glass-strong);
  color: var(--ink-muted-80);
  box-shadow: inset 0 1px 0 var(--sheen);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--slide-trans);
}

.auth-close:hover {
  color: var(--ink);
  border-color: var(--hairline-strong);
  background: var(--hairline);
}

/* ===== 头部 ===== */
.auth-head {
  margin-bottom: 26px;
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

/* 品牌块：实心主题色圆 + 镂空线条（与着陆页、图标条共用同一张遮罩）。
   遮罩加载失败时 border-radius 兜住圆形。 */
.auth-logo-mark {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: var(--accent);
  border-radius: 50%;
  -webkit-mask-image: url('../assets/logo-mark-cutout.png');
  mask-image: url('../assets/logo-mark-cutout.png');
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

.auth-logo-text {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--on-dark);
}

.auth-logo-text em {
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  background: var(--grad-accent);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-left: 4px;
}

/* ===== 切换标签 ===== */
.auth-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 9999px;
  background: var(--glass-strong);
  border: 1px solid var(--hairline);
  box-shadow: inset 0 1px 0 var(--sheen), inset 0 12px 24px -20px var(--sheen);
}

.auth-tabs button {
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: var(--body-muted);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}

.auth-tabs button.active {
  background: var(--grad-accent);
  color: var(--on-primary);
  box-shadow: 0 4px 14px var(--page-accent-wash-strong);
}

/* ===== 管理员通道 =====
   沿用 .auth-tabs 的胶囊外形（同样的高度、圆角与玻璃底），
   只把配色换成强调色描边 —— 一眼能看出「这里换了个入口」，
   又不会跳出现有的材质语言。 */
.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 9999px;
  background: var(--accent-wash);
  border: 1px solid var(--accent-line);
  color: var(--accent-hover);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.admin-back {
  display: block;
  width: 100%;
  margin-top: 14px;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--body-muted);
  font-size: 13px;
  cursor: pointer;
  transition: var(--slide-trans);
}
.admin-back:hover {
  color: var(--accent-hover);
}

/* ===== 表单 ===== */
.auth-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.auth-form :deep(.el-form-item__label) {
  color: var(--body);
  font-size: 13px;
  margin-bottom: 6px;
}

/* 胶囊 + 强柔光玻璃。内边距 14→20：约 48px 高的胶囊圆弧半径 24px，
   输入内容要离端点足够远才不贴边。 */
.auth-form :deep(.el-input__wrapper) {
  border-radius: 999px;
  background: var(--glass-strong);
  box-shadow: 0 0 0 1px var(--hairline) inset, inset 0 1px 0 var(--sheen);
  padding: 4px 20px;
}

.auth-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--accent) inset !important;
  background: rgba(255, 255, 255, 0.07);
}

.auth-form :deep(.el-input__inner) {
  color: var(--ink);
  height: 40px;
}

.auth-form :deep(.el-input__inner::placeholder) {
  color: var(--body-muted);
}

/* 与着陆页主按钮同款：强调色描边 + 20% 强调色底 + 强调色文字 + 内高光。

   选择器必须写成 .auth-modal .auth-submit.el-button：
   App.vue 的全局 .el-button.el-button--primary 特异性是 (0,2,0)，
   而只写 .auth-submit 编译后（.auth-submit[data-v-x]）也是 (0,2,0) ——
   同特异性下靠样式加载顺序决定胜负，不可靠。加一层类名提到 (0,3,0)+ 才稳。 */
.auth-modal .auth-submit.el-button {
  width: 100%;
  height: 48px;
  margin-top: 6px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent-wash-2), var(--accent-wash));
  border: 1px solid var(--accent-line);
  color: var(--accent-hover);
  box-shadow: inset 0 1px 0 var(--sheen), 0 4px 14px var(--accent-wash);
}

.auth-modal .auth-submit.el-button:hover {
  background: var(--accent-wash-2);
  border-color: var(--accent);
  color: var(--accent-hover);
}

/* ===== 过渡 ===== */
.auth-fade-enter-active,
.auth-fade-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}

.auth-fade-enter-active .auth-modal,
.auth-fade-leave-active .auth-modal {
  transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out);
}

.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
}

.auth-fade-enter-from .auth-modal,
.auth-fade-leave-to .auth-modal {
  transform: translateY(16px) scale(0.97);
  opacity: 0;
}
</style>
