<!--
  ============================================================
  LoginView.vue — 登录页面
  作用：用户输入用户名和密码登录系统。
  登录成功后跳转到 AI 面试聊天界面。

  .vue 文件三要素复习：
    <template> — HTML 结构（页面上有什么）
    <script>   — JS 逻辑（页面怎么工作）
    <style>    — CSS 样式（页面长什么样）
  ============================================================
-->

<template>
  <!-- 最外层容器：让登录卡片在整个屏幕居中显示 -->
  <div class="login-container">
    <!-- 登录卡片：白色圆角背景，包含表单内容 -->
    <div class="login-card">
      <!-- 大标题 -->
      <h1 class="title">AI 面试系统</h1>
      <!-- 副标题灰色小字 -->
      <p class="subtitle">请登录您的账号，开始开始您的面试之旅</p>

      <!--
        el-form 是 Element Plus 组件库提供的表单组件
        ref="formRef"   — 给表单起个名字，方便 JS 里操作（如获取表单数据、校验）
        :model="form"   — 双向绑定表单数据对象，:前缀表示这是一个动态值（JS 表达式）
        :rules="rules"  — 绑定校验规则
        label-position  — 标签位置，"top" 表示标签在输入框上方
      -->
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <!--
          表单项：用户名
          prop="username" — 指定这个表单项对应 form 数据对象里的 username 字段
        -->
        <el-form-item label="用户名" prop="username">
          <!--
            v-model="form.username" — 双向绑定：
              用户在输入框打字 → form.username 的值自动更新
              代码改了 form.username → 输入框内容也自动更新
            :prefix-icon="User" — 输入框前显示用户图标
            size="large"        — 输入框尺寸：大号
          -->
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <!-- 表单项：密码 -->
        <el-form-item label="密码" prop="password">
          <!--
            type="password"   — 输入类型为密码（输入时显示圆点）
            show-password     — 显示一个切换按钮，点击可以查看/隐藏密码
            @keyup.enter      — 键盘事件监听：按下回车键时触发 handleLogin
          -->
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <!-- 登录按钮区域 -->
        <el-form-item>
          <!--
            :loading="loading" — 加载状态：true 时按钮显示转圈动画并禁用
            @click            — 点击事件：点击按钮触发 handleLogin 函数
          -->
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="submit-btn"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 底部跳转链接 -->
      <div class="switch-link">
        <!--
          router-link 是 Vue Router 提供的导航组件
          to="/register" — 点击后浏览器地址变成 /register，显示注册页
          和 <a href="/register"> 的区别：router-link 不会刷新整个页面，切换更快
        -->
        还没有账号？请先<router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
  <script setup> 是 Vue 3 的"语法糖"写法。
  在这个标签里写 JS 代码，Vue 会自动帮你处理好所有繁琐的注册步骤。
  不再需要写 export default { ... } 这种老式写法。
*/

// ============================================================
// 1. 引入依赖（就像 C 语言的 #include 或 Python 的 import）
// ============================================================

// ref 和 reactive — Vue 的"响应式数据"工具
//   跟普通变量的区别：如果数据变了，页面自动更新
import { ref, reactive } from 'vue'

// useRouter — 获取路由器，用来在代码中跳转页面（如登录成功→跳转到聊天页）
import { useRouter } from 'vue-router'

// ElMessage — Element Plus 的消息提示组件（会在页面右上角弹出提示条）
import { ElMessage } from 'element-plus'

// User, Lock — 图标组件，来自 Element Plus 图标库
import { User, Lock } from '@element-plus/icons-vue'

// loginAPI — 登录接口函数，定义在 src/api/index.js 里
//    负责把用户名密码发给后端服务器
import { loginAPI } from '@/api/index'

// ============================================================
// 2. 创建工具实例和响应式数据
// ============================================================

// useRouter() 获取路由实例,之后用它做页面跳转
const router = useRouter()

// ref(null) 创建一个响应式引用，初始值为 null
// 等页面渲染完成后，Vue 会自动把表单 DOM 元素赋给它
// 之后就能用 formRef.value 操作表单（如调用校验方法）
const formRef = ref(null)

// loading = ref(false)：控制登录按钮的加载动画
//   发送请求时设为 true → 按钮转圈、禁用
//   请求完成后设为 false → 恢复正常
const loading = ref(false)

// reactive({...}) 创建响应式对象，存放表单数据
//   username — 用户名输入框的值
//   password — 密码输入框的值
//   注意：reactive 只能用于对象，ref 可用于任意类型
const form = reactive({
  username: '',  // 初始为空字符串
  password: ''   // 初始为空字符串
})

// ============================================================
// 3. 密码校验规则（自定义验证器）
// ============================================================

// validatePassword 是一个"自定义校验函数"
// 参数说明：
//   _rule   — 校验规则对象（这里用不到，用 _ 前缀表示忽略）
//   value   — 用户输入的密码值
//   callback — 回调函数：校验通过调 callback()，不通过调 callback(new Error('错误信息'))
const validatePassword = (_rule, value, callback) => {
  // 3.1 检查是否为空
  if (!value) {
    callback(new Error('请输入密码'))
    return  // 提前结束，后面的检查不用做了
  }
  // 3.2 检查长度 >= 8
  if (value.length < 8) {
    callback(new Error('密码长度不能少于 8 位'))
    return
  }
  // 3.3 检查是否同时包含字母和数字
  //     /.../ 是正则表达式的写法
  //     (?=.*[a-zA-Z]) 表示"往前看，任意字符后面必须跟一个字母"
  //     (?=.*\d)       表示"往前看，任意字符后面必须跟一个数字"
  //     .test(value)   测试 value 是否匹配这个正则
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
    callback(new Error('密码必须包含字母和数字的组合'))
    return
  }
  // 全部通过！调用 callback() 表示校验通过
  callback()
}

// 校验规则对象（rules）
// 这是 Element Plus 表单规定的格式，一个数组包含多条规则
const rules = {
  // 用户名的校验规则
  username: [
    {
      required: true,                    // 必填
      message: '请输入用户名',            // 不填时的错误提示
      trigger: 'blur'                    // 触发时机：blur = 输入框失去焦点时校验
    }
  ],
  // 密码的校验规则（使用自定义的 validatePassword 函数）
  password: [
    {
      validator: validatePassword,       // 使用自定义校验函数
      trigger: 'blur'                    // 失去焦点时触发
    }
  ]
}

// ============================================================
// 4. 登录处理函数（核心业务逻辑）
//    async 表示这是一个"异步函数"——里面会用 await 等待网络请求
// ============================================================
const handleLogin = async () => {
  // 4.1 先校验表单是否填写正确
  //     formRef.value.validate() 调用 Element Plus 表单的校验方法
  //     .catch(() => false) 如果校验失败（promise reject），返回 false 而不是报错
  //     await 等待校验完成
  const valid = await formRef.value.validate().catch(() => false)
  // 4.2 如果校验不通过，直接终止，不发送请求
  if (!valid) return

  // 4.3 校验通过，开启加载动画
  loading.value = true

  // 4.4 try...catch...finally 是异常处理结构
  //     try    — 尝试执行可能出错的代码
  //     catch  — 如果出错，在这里处理错误
  //     finally — 不管成功还是失败，最后都会执行的代码
  try {
    // 调用登录接口，把表单中的用户名和密码发给后端
    // await — 等待后端返回结果后再继续往下执行
    // { data } — 解构赋值，从返回对象中取出 data 字段
    const { data } = await loginAPI(form.username, form.password)

    // 4.5 如果后端返回了 error 字段，说明登录失败（如密码错误）
    if (data.error) {
      // ElMessage.error() 弹出红色的错误提示条
      ElMessage.error(data.error)
      return  // 终止，不继续往下走
    }

    // 4.6 登录成功！把登录信息存到浏览器的 localStorage 里
    //     localStorage 是浏览器提供的本地存储，页面关闭后数据还在
    //     setItem(键名, 值) — 存数据
    //     getItem(键名)     — 读数据
    localStorage.setItem('token', data.token || '')
    //                              ↑ || '' 是"默认值"：如果 data.token 不存在就用空字符串
    localStorage.setItem('username', data.username || form.username)

    // 弹出绿色成功提示
    ElMessage.success(data.message || '登录成功')

    // 用路由器跳转到聊天页面
    // router.push() 相当于在浏览器地址栏输入 /chat
    router.push('/chat')
  } catch (err) {
    // 4.7 如果请求过程中出现技术性错误（如网络断开、后端宕机）
    //     err.response?.data?.error — 尝试从后端的错误响应中取出错误信息
    //     ?. 是"可选链"操作符：如果前面是 null/undefined 就返回 undefined 而不报错
    //     || '...' — 如果取不到后端错误信息，就用我们的默认提示
    const errorMessage = err.response?.data?.error
                      || err.response?.data?.detail
                      || '登录失败，请检查后端服务是否启动'
    ElMessage.error(errorMessage)
  } finally {
    // 4.8 不管登录成功还是失败，最后都要关闭加载动画
    loading.value = false
  }
}
</script>

<style scoped>
/* ============================================================
   CSS（层叠样式表）说明：
   - 这里控制的是"外观"：颜色、大小、间距、圆角等
   - scoped 表示这些样式只对这个文件生效
   ============================================================ */

/* 登录页背景容器：全屏 + 居中 + 背景渐变 */
.login-container {
  min-height: 100vh;        /* 最小高度 = 整个浏览器窗口高度（vh 是 viewport height 单位） */
  display: flex;            /* Flex 弹性布局 */
  align-items: center;      /* 子元素垂直居中 */
  justify-content: center;  /* 子元素水平居中 */
  background: linear-gradient(135deg, #dbeafe 100%);
  /*        ↑ 渐变背景：角度 135 度，从 #dbeafe（浅蓝）过渡 */
}

/* 登录卡片：白色背景 + 圆角 + 阴影 */
.login-card {
  width: 420px;                           /* 卡片宽度 420 像素 */
  padding: 48px 40px;                     /* 内边距：上下 48px，左右 40px */
  background: #ffffff;                    /* 背景色：纯白 */
  border-radius: 16px;                    /* 圆角：16 像素，越大越圆 */
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  /*          ↑ 阴影：右偏移0、下偏移20px、模糊60px、黑色15%不透明度 */
}

/* 大标题 */
.title {
  text-align: center;       /* 文字居中 */
  font-size: 28px;          /* 字号 */
  color: #303133;           /* 文字颜色（深灰） */
  margin: 0 0 8px;          /* 外边距：上0、右0、下8px、左0 */
}

/* 副标题 */
.subtitle {
  text-align: center;
  font-size: 14px;
  color: #909399;           /* 更浅的灰色 */
  margin: 0 0 32px;         /* 下方 32px 间距，与表单拉开距离 */
}

/* 登录按钮 */
.submit-btn {
  width: 100%;              /* 按钮占满一行 */
  background-color: #fda4af; /* 粉色背景 */
}

/* 底部跳转链接文字 */
.switch-link {
  text-align: center;
  font-size: 14px;
  color: #909399;
}

/* 链接样式 */
.switch-link a {
  color: #687582;           /* 链接颜色 */
  text-decoration: none;    /* 去掉下划线 */
}
</style>
