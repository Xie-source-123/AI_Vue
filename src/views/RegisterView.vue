<!--
  ============================================================
  RegisterView.vue — 注册页面
  作用：新用户输入用户名和密码创建账号。
  注册成功后跳转到登录页。

  和 LoginView.vue 结构几乎一样，不同之处在于：
  - 多了一个"确认密码"输入框
  - 调用的接口是 registerAPI 而不是 loginAPI
  - 注册成功后跳到 /login 而不是 /chat
  ============================================================
-->

<template>
  <!-- 全屏背景容器，居中显示注册卡片 -->
  <div class="register-container">
    <!-- 白色圆角注册卡片 -->
    <div class="register-card">
      <h1 class="title">创建账号</h1>
      <p class="subtitle">注册后开始 AI 面试</p>

      <!-- Element Plus 表单组件 -->
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <!-- 表单项：用户名 -->
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <!-- 表单项：密码 -->
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <!-- 表单项：确认密码（注册页独有，登录页没有这个） -->
        <el-form-item label="确认密码" prop="confirmPassword">
          <!-- @keyup.enter — 按下回车键直接提交注册 -->
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <!-- 注册按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="submit-btn"
            @click="handleRegister"
          >
            注 册
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 已有账号？跳转到登录页 -->
      <div class="switch-link">
        已有账号？请先<router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// ============================================================
// 1. 引入依赖
// ============================================================
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
// registerAPI — 注册接口函数（定义在 src/api/index.js）
import { registerAPI } from '@/api/index'

// ============================================================
// 2. 创建工具实例和响应式数据
// ============================================================
const router = useRouter()      // 路由器实例，用于页面跳转
const formRef = ref(null)       // 表单引用，用于校验
const loading = ref(false)      // 按钮加载状态

// 表单数据对象（比登录页多一个 confirmPassword 确认密码字段）
const form = reactive({
  username: '',          // 用户名
  password: '',          // 密码
  confirmPassword: ''    // 确认密码（需要和 password 保持一致才算通过）
})

// ============================================================
// 3. 校验规则
// ============================================================

// 3.1 确认密码校验：必须和密码框输入的内容一样
const validateConfirm = (rule, value, callback) => {
  if (value !== form.password) {
    // 两次输入不一致 → 校验失败
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()  // 一致 → 校验通过
  }
}

// 3.2 密码复杂度校验：长度 >= 8 且包含字母和数字
const validatePassword = (_rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'))
    return
  }
  if (value.length < 8) {
    callback(new Error('密码长度不能少于 8 位'))
    return
  }
  // 正则表达式检查：必须同时包含字母和数字
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
    callback(new Error('密码必须包含字母和数字的组合'))
    return
  }
  callback()
}

// 3.3 汇总所有校验规则
const rules = {
  // 用户名：必填
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],

  // 密码：使用自定义的复杂度校验
  password: [{ validator: validatePassword, trigger: 'blur' }],

  // 确认密码：必填 + 和密码一致
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

// ============================================================
// 4. 注册处理函数
// ============================================================
const handleRegister = async () => {
  // 4.1 先校验表单
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return  // 校验不通过就终止

  // 4.2 开启加载状态
  loading.value = true

  try {
    // 4.3 调用注册接口
    //     只传 username 和 password（不需要传 confirmPassword，后端只要密码）
    const { data } = await registerAPI(form.username, form.password)

    // 4.4 如果后端返回了 error（比如用户名已被注册）
    if (data.error) {
      ElMessage.error(data.error)  // 展示后端返回的错误消息
      return
    }

    // 4.5 注册成功！弹出成功提示
    ElMessage.success(data.message || '注册成功')

    // 4.6 跳转到登录页（让用户用刚注册的账号登录）
    router.push('/login')
  } catch (err) {
    // 4.7 网络错误或后端异常时的兜底处理
    const errorMessage = err.response?.data?.error
                      || err.response?.data?.detail
                      || '注册失败，请检查后端服务是否启动'
    ElMessage.error(errorMessage)
  } finally {
    // 4.8 无论成功失败，关闭加载动画
    loading.value = false
  }
}
</script>

<style scoped>
/* 全屏背景：居中 + 浅蓝渐变 */
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #dbeafe 100%);
}

/* 注册卡片 */
.register-card {
  width: 420px;
  padding: 48px 40px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

/* 标题 */
.title {
  text-align: center;
  font-size: 28px;
  color: #303133;
  margin: 0 0 8px;
}

/* 副标题 */
.subtitle {
  text-align: center;
  font-size: 14px;
  color: #909399;
  margin: 0 0 32px;
}

/* 注册按钮：满宽 + 粉色背景 */
.submit-btn {
  width: 100%;
  background-color: #fda4af;
}

/* 底部链接 */
.switch-link {
  text-align: center;
  font-size: 14px;
  color: #909399;
}

.switch-link a {
  color: #687582;
  text-decoration: none;
}
</style>
