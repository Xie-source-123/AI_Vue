<!--
  ============================================================
  ChatView.vue — AI 面试聊天页面（整个项目的核心页面）
  作用：提供一个类似微信/钉钉的聊天界面，用户和 AI 面试官对话。
  页面分为两大块：
    左边侧边栏 — 用户信息、岗位选择、功能按钮、退出登录
    右边聊天区 — 顶部标题栏、聊天消息列表、底部输入框 + 工具栏
  ============================================================
-->

<template>
  <!-- 整个页面的外层容器，使用 Flex 布局把侧边栏和聊天区分左右两栏 -->
  <div class="chat-container">
    <!-- ============ 左侧边栏 ============ -->
    <aside class="sidebar">
      <!-- 侧边栏顶部：用户头像 + 用户名 + 在线状态 -->
      <div class="sidebar-header">
        <div class="user-profile">
          <div class="avatar-wrapper">
            <el-avatar :size="44" class="user-avatar">
              {{ username.charAt(0).toUpperCase() }}
            </el-avatar>
          </div>
          <div class="user-info">
            <span class="user-name">{{ username }}</span>
            <span class="user-status">在线</span>
          </div>
        </div>
      </div>

      <div class="sidebar-menu">
        <!-- 【修改】新对话按钮增加圆角 -->
        <el-button class="new-chat-btn" type="primary" @click="startNewChat" round>
          <el-icon><Plus /></el-icon>
          新对话
        </el-button>

        <!-- 【修改】岗位选择：由下拉菜单改为按钮 + 弹出菜单 -->
        <div class="menu-section">
          <span class="menu-label">岗位选择</span>
          <el-popover
            v-model:visible="positionVisible"
            placement="right-start"
            :width="180"
            trigger="click"
          >
            <template #reference>
              <el-button class="position-btn" round>
                <el-icon><Briefcase /></el-icon>
                <span>{{ position }}</span>
                <el-icon class="arrow-icon"><ArrowDown /></el-icon>
              </el-button>
            </template>
            <div class="position-menu">
              <div
                v-for="p in positionOptions"
                :key="p.value"
                class="position-item"
                :class="{ active: position === p.value }"
                @click="selectPosition(p.value)"
              >
                <el-icon v-if="position === p.value" class="check-icon"><Check /></el-icon>
                <span :style="{ marginLeft: position === p.value ? '0' : '20px' }">{{ p.label }}</span>
              </div>
            </div>
          </el-popover>
        </div>

        <!-- 【新增】题库导入按钮（后端接口接入位置见下方 handleImportQuestions） -->
        <div class="menu-section">
          <el-button class="feature-btn" @click="handleImportQuestions" round>
            <el-icon><Upload /></el-icon>
            题库导入
          </el-button>
        </div>

        <!-- 【新增】成绩报告查询按钮（后端接口接入位置见下方 handleScoreReport） -->
        <div class="menu-section">
          <el-button class="feature-btn" @click="handleScoreReport" round>
            <el-icon><Document /></el-icon>
            成绩报告
          </el-button>
        </div>

        <!-- 【新增】难度选择按钮（后端接口接入位置见下方 handleDifficulty） -->
        <div class="menu-section">
          <el-button class="feature-btn" @click="handleDifficulty" round>
            <el-icon><Setting /></el-icon>
            难度选择
          </el-button>
        </div>
      </div>

      <div class="sidebar-footer">
        <!-- 【新增】切换账号功能，位于退出登录上方 -->
        <el-button class="footer-btn" text @click="handleSwitchAccount">
          <el-icon><Switch /></el-icon>
          切换账号
        </el-button>
        <el-button class="footer-btn" text @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出登录
        </el-button>
      </div>
    </aside>

    <!-- 主聊天区 -->
    <main class="chat-main">
      <!-- 顶部栏 -->
      <header class="chat-header">
        <div class="header-left">
          <span class="chat-title">{{ position }} - 模拟面试</span>
        </div>
        <div class="header-right">
          <el-tooltip content="清空对话" placement="bottom">
            <el-button text circle @click="clearMessages">
              <el-icon :size="20"><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </header>

      <!-- 消息列表 -->
      <div class="message-list" ref="messageListRef">
        <div v-if="messages.length === 0" class="empty-chat">
          <div class="empty-icon">
            <el-icon :size="64"><ChatDotRound /></el-icon>
          </div>
          <p>选择岗位，开始 AI 模拟面试</p>
          <div class="quick-questions">
            <el-tag
              v-for="q in quickQuestions"
              :key="q"
              class="quick-tag"
              @click="sendMessage(q)"
            >
              {{ q }}
            </el-tag>
          </div>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message-item"
          :class="msg.role"
        >
          <div class="message-avatar">
            <el-avatar v-if="msg.role === 'user'" :size="36" :icon="UserFilled" />
            <el-avatar v-else :size="36" :icon="ChatDotRound" class="ai-avatar" />
          </div>
          <div class="message-content">
            <div class="message-role">{{ msg.role === 'user' ? username : 'AI 面试官' }}</div>
            <div class="message-text">{{ msg.content }}</div>
            <div class="message-time">{{ msg.time }}</div>
          </div>
        </div>

        <!-- 打字动画 -->
        <div v-if="typing" class="message-item ai">
          <div class="message-avatar">
            <el-avatar :size="36" :icon="ChatDotRound" class="ai-avatar" />
          </div>
          <div class="message-content">
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 【修改】输入区：文本框改为自适应高度，增加圆角和玻璃特效发送按钮 -->
      <footer class="chat-input-area">
        <div class="input-wrapper">
          <el-input
            v-model="inputText"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 5 }"
            placeholder="输入你的回答或问题..."
            class="chat-textarea"
            @keyup.enter.exact="sendMessage(inputText)"
          />
          <!-- 【修改】发送按钮：添加玻璃特效（毛玻璃效果） -->
          <el-button
            type="primary"
            :disabled="!inputText.trim() || sending"
            :loading="sending"
            class="send-btn-glass"
            round
            @click="sendMessage(inputText)"
          >
            发送
          </el-button>
        </div>

        <!-- 【新增】底部工具栏：相机、相册、录音、上传文件（仅按钮，后端接口接入位置见下方对应函数） -->
        <div class="toolbar">
          <!-- 相机按钮 —— 后端接口接入位置见 handleCameraCapture -->
          <el-button class="toolbar-btn" circle @click="handleCameraCapture">
            <el-icon :size="20"><Camera /></el-icon>
          </el-button>
          <!-- 相册按钮 —— 后端接口接入位置见 handleAlbumSelect -->
          <el-button class="toolbar-btn" circle @click="handleAlbumSelect">
            <el-icon :size="20"><Picture /></el-icon>
          </el-button>
          <!-- 录音按钮 —— 后端接口接入位置见 handleVoiceRecord -->
          <el-button class="toolbar-btn" circle @click="handleVoiceRecord">
            <el-icon :size="20"><Microphone /></el-icon>
          </el-button>
          <!-- 上传文件按钮 —— 后端接口接入位置见 handleFileUpload -->
          <el-button class="toolbar-btn" circle @click="handleFileUpload">
            <el-icon :size="20"><FolderOpened /></el-icon>
          </el-button>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup>
/*
  ============================================================
  <script setup> — JS 逻辑区
  这里写的是页面的"行为"：数据怎么存、按钮点了触发什么、
  消息怎么发送和接收、用户操作怎么响应。

  Vue 3 核心概念速查：
    ref()      — 创建一个"响应式盒子"，盒子里放数据。
                 数据变了 → 页面自动更新。用 .value 读/写。
    reactive() — 同上但只能装对象。
    const      — 声明一个"常量"（创建后不能重新赋值），
                 但不影响盒子里的数据被修改。

  生命周期：页面加载 → setup 执行 → 模板渲染 → 用户交互 → 响应式更新
  ============================================================
*/

// ============================================================
// 1. 引入依赖（工具库、组件、接口函数）
// ============================================================

// ref — 创建响应式数据（相当于一个能自动通知页面更新的"魔法盒子"）
// nextTick — 等待下一次页面更新完成后再执行代码
import { ref, nextTick } from 'vue'

// useRouter — 获取路由器实例，用来在代码中控制页面跳转
import { useRouter } from 'vue-router'

// ElMessage — 弹出消息提示（成功/错误/警告等，出现在页面右上角）
// ElMessageBox — 弹出确认对话框（有"确定"和"取消"按钮）
import { ElMessage, ElMessageBox } from 'element-plus'

// 引入所有需要的图标组件（@element-plus/icons-vue 是图标库）
import {
  Plus, Delete, SwitchButton, ChatDotRound, UserFilled,
  Briefcase, ArrowDown, Check, Upload, Document, Setting, Switch,
  Camera, Picture, Microphone, FolderOpened
} from '@element-plus/icons-vue'

// chatAPI — 聊天接口函数（定义在 src/api/index.js，负责和后端通信）
import { chatAPI } from '@/api/index'

// ============================================================
// 2. 创建工具实例和响应式数据（页面的"状态"）
// ============================================================

// router — 路由器，用于 router.push('/login') 这样的页面跳转
const router = useRouter()

// messageListRef — 消息列表 DOM 元素的引用，用于自动滚动到底部
// ref(null) 初始为空，Vue 渲染后自动填入对应的 DOM 元素
const messageListRef = ref(null)

// username — 当前登录用户名
// 从 localStorage（浏览器本地存储）中读取，如果没读到就用默认值'用户'
const username = ref(localStorage.getItem('username') || '用户')

// position — 当前选择的面试岗位（默认 "Java后端"）
// 这个值会传给后端，让 AI 面试官根据岗位出题
const position = ref('Java后端')

// inputText — 用户正在输入的文字（输入框绑定的值）
const inputText = ref('')

// sending — 是否正在发送消息中（true = 显示加载状态，禁用按钮）
const sending = ref(false)

// typing — AI 是否正在"打字"（true = 显示三点跳动动画）
const typing = ref(false)

// messages — 消息列表数组，每条消息是一个对象 { role, content, time }
// 初始为空数组，用户和 AI 发一条就 push 一条进去
const messages = ref([])

// positionVisible — 岗位选择弹出菜单是否可见（true = 弹出，false = 隐藏）
const positionVisible = ref(false)

// positionOptions — 可供选择的岗位列表
// 每条是一个对象 { label: '显示文字', value: '传给后端的值' }
const positionOptions = [
  { label: 'Java 后端', value: 'Java后端' },
  { label: 'Web 前端', value: 'Web前端' },
  { label: '算法岗', value: '算法岗' },
  { label: '数据分析', value: '数据分析' },
  { label: 'Python 开发', value: 'Python开发' },
  { label: '产品经理', value: '产品经理' }
]

// quickQuestions — 聊天区为空时显示的几个快速开始问题
const quickQuestions = [
  '请开始面试',
  '请介绍一下你自己',
  '开始技术面试'
]

// ============================================================
// 3. 工具函数和业务逻辑
// ============================================================

// 滚动到底部 —— 当新消息出现时，自动把聊天区滚到最下面
// async 表示异步函数，await nextTick() 等 Vue 渲染完再滚动
const scrollToBottom = async () => {
  await nextTick()  // 等待 Vue 完成本轮页面更新（DOM 渲染完了）
  if (messageListRef.value) {  // 确保消息列表 DOM 元素存在
    // scrollTop 是滚动条的位置，scrollHeight 是内容总高度
    // 把 scrollTop 设为 scrollHeight 表示滚到最底部
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

// 获取当前时间字符串 —— 格式 HH:MM（如 14:30）
const getTime = () => {
  const now = new Date()       // 获取当前日期时间
  // getHours() 返回小时（0-23），getMinutes() 返回分钟（0-59）
  // .toString() 转成字符串
  // .padStart(2, '0') — 不够 2 位时前面补零（如 5 → "05"）
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// 选择岗位 —— 点击岗位弹出菜单的某一项时触发
const selectPosition = (value) => {
  position.value = value         // 更新当前岗位
  positionVisible.value = false  // 关闭弹出菜单
}

// ============================================================
// 4. 发送消息 — 整个聊天页最核心的业务逻辑
//   流程：校验 → 显示用户消息 → 调后端API → 显示AI回复
// ============================================================
const sendMessage = async (text) => {
  // 4.1 获取要发送的消息文本
  //     如果传了 text 参数就用它（快速提问/回车发送），否则取输入框的值
  //     .trim() 去掉首尾空格
  const msg = (text || inputText.value).trim()

  // 4.2 如果消息为空，或者正在发送中，就不做任何事
  if (!msg || sending.value) return

  // 4.3 把用户消息添加到消息列表末尾（push = 往数组后面加一项）
  messages.value.push({
    role: 'user',       // 角色：用户
    content: msg,       // 内容：用户输入的文字
    time: getTime()     // 时间：当前时间
  })

  // 4.4 清空输入框
  inputText.value = ''

  // 4.5 滚动到最底部，让新消息可见
  scrollToBottom()

  // 4.6 标记发送中 + 显示 AI 打字动画
  sending.value = true
  typing.value = true
  scrollToBottom()

  // 4.7 调用后端 API，发送消息并等待回复
  try {
    // 获取用户 ID（从 localStorage 读，兜底用 local_user_001）
    const userId = localStorage.getItem('username') || 'local_user_001'

    // await — 等待后端返回（这期间浏览器不会卡住，其他操作仍然可以响应）
    // chatAPI 返回一个 axios 响应对象，{ data } 取出响应体
    const { data } = await chatAPI(msg, position.value, userId)

    // 收到回复，关掉打字动画
    typing.value = false

    // 把 AI 的回复也加入消息列表
    messages.value.push({
      role: 'ai',                                      // 角色：AI
      content: data.reply || 'AI 暂无回复',             // 内容：后端返回的回复
      time: getTime()                                  // 时间
    })
  } catch (err) {
    // 4.8 如果出错（网络断开、后端宕机等）
    typing.value = false  // 关打字动画

    // 尝试从错误对象中提取有用信息
    // err.response?.data?.error — 后端返回的业务错误（如"参数错误"）
    // err.response?.data?.detail — 另一种后端错误格式
    // '消息发送失败...' — 如果什么都取不到，就用这个默认提示
    const errorMessage = err.response?.data?.error
                      || err.response?.data?.detail
                      || '消息发送失败，请检查后端服务是否启动'
    ElMessage.error(errorMessage)  // 弹出红色错误提示
  } finally {
    // 4.9 不管成功还是失败，最后都要：
    sending.value = false  // 关闭发送状态
    scrollToBottom()       // 滚动到底部
  }
}

// 开始新对话 —— 清空所有消息，重新开始
const startNewChat = () => {
  messages.value = []                // 把消息列表清空
  ElMessage.success('已开启新对话')    // 弹出绿色成功提示
}

// 清空消息 —— 带确认对话框的清空操作
const clearMessages = async () => {
  // ElMessageBox.confirm() 弹出一个确认框
  // await 等待用户点击"确定"或"取消"
  await ElMessageBox.confirm('确定要清空当前对话吗？', '提示', {
    confirmButtonText: '确定',  // 确定按钮文字
    cancelButtonText: '取消',   // 取消按钮文字
    type: 'warning'            // 类型为警告（显示黄色图标）
  })
  // 用户点了"确定"才会执行到这里
  messages.value = []
  ElMessage.success('对话已清空')
}

// 切换账号 —— 清除登录信息，回到登录页
const handleSwitchAccount = async () => {
  await ElMessageBox.confirm('切换账号将退出当前登录，是否继续？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  // localStorage.removeItem() 删除浏览器本地存储中的数据
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')  // 跳转到登录页
}

// 退出登录 —— 清除登录信息，回到登录页
const handleLogout = async () => {
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}

// ============================================================
// 5. 侧边栏功能按钮（待接入后端接口）
//    以下函数目前只弹出提示，括号里的 TODO 注释说明了如何接入后端。
//    把注释中的示例代码取消注释、替换为真实接口即可。
// ============================================================
const handleImportQuestions = () => {
  // TODO: 接入后端题库导入接口
  // 示例调用：
  //   const formData = new FormData()
  //   formData.append('file', selectedFile)
  //   const { data } = await api.post('/api/questions/import', formData)
  //   if (data.success) { ElMessage.success('题库导入成功') }
  ElMessage.info('题库导入功能待接入后端接口')
}

// ============================================================
// 【新增】成绩报告查询 —— 后端接口接入位置
// 后端接口：GET /api/score/report?user_id=xxx
// 或：POST /api/score/report  body: { user_id, session_id }
// 返回：{ total_score, details: [...], summary }
// ============================================================
const handleScoreReport = () => {
  // TODO: 接入后端成绩报告查询接口
  // 示例调用：
  //   const userId = localStorage.getItem('username')
  //   const { data } = await api.get('/api/score/report', { params: { user_id: userId } })
  //   // data.total_score, data.details 用于渲染成绩面板
  ElMessage.info('成绩报告功能待接入后端接口')
}

// ============================================================
// 【新增】难度选择 —— 后端接口接入位置
// 后端接口：POST /api/interview/difficulty
// 请求体：{ user_id: string, difficulty: 'easy' | 'medium' | 'hard' }
// 返回：{ message: '难度已更新', difficulty: string }
// ============================================================
const handleDifficulty = () => {
  // TODO: 接入后端难度选择接口
  // 示例：弹出难度选择对话框，确认后调用接口
  //   const { data } = await api.post('/api/interview/difficulty', {
  //     user_id: localStorage.getItem('username'),
  //     difficulty: selectedDifficulty
  //   })
  //   ElMessage.success(`难度已切换为：${selectedDifficulty}`)
  ElMessage.info('难度选择功能待接入后端接口')
}

// ============================================================
// 【新增】相机拍照 —— 后端接口接入位置
// 后端接口：POST /api/media/camera
// 说明：调用浏览器 getUserMedia 拍照后将 base64/Blob 上传后端做 OCR 或图片分析
// ============================================================
const handleCameraCapture = () => {
  // TODO: 接入相机拍照 + 后端上传接口
  ElMessage.info('相机功能待接入后端接口')
}

// ============================================================
// 【新增】相册选择 —— 后端接口接入位置
// 后端接口：POST /api/media/upload
// 请求方式：FormData，字段名 file
// 返回：{ url: string, filename: string }
// ============================================================
const handleAlbumSelect = () => {
  // TODO: 接入相册选择 + 后端上传接口
  ElMessage.info('相册功能待接入后端接口')
}

// ============================================================
// 【新增】录音 —— 后端接口接入位置
// 后端接口：POST /api/media/voice
// 说明：通过 MediaRecorder API 录音后将 audio Blob 上传后端做语音识别
// ============================================================
const handleVoiceRecord = () => {
  // TODO: 接入录音 + 后端语音识别接口
  ElMessage.info('录音功能待接入后端接口')
}

// ============================================================
// 【新增】文件上传 —— 后端接口接入位置
// 后端接口：POST /api/media/upload
// 请求方式：FormData，字段名 file
// 支持类型：pdf, doc, docx, txt 等
// 返回：{ url: string, filename: string, file_type: string }
// ============================================================
const handleFileUpload = () => {
  // TODO: 接入文件上传接口
  ElMessage.info('文件上传功能待接入后端接口')
}
</script>

<style scoped>
/*
  ============================================================
  <style scoped> — CSS 样式区（决定页面"长什么样"）

  CSS 基础概念：
    .xxx       — 类选择器（选择 class="xxx" 的元素）
    #xxx       — ID 选择器（选择 id="xxx" 的元素）
    :hover     — 伪类（鼠标悬停在元素上时生效）
    ::before   — 伪元素（在元素前面创建一个虚拟子元素）
    display    — 布局方式（flex = 弹性布局，block = 块级）
    transition — 过渡动画（样式变化时平滑过渡而非瞬间跳变）
    @keyframes — 关键帧动画（定义一段动画的中间状态）
    px         — 像素单位（屏幕上的物理像素点）
    rem        — 相对单位（相对于根元素字号）
    vh         — 视口高度单位（100vh = 整个窗口高度）
    rgba(r,g,b,a) — 带透明度的颜色（a 在 0~1 之间）

  scoped 属性：这些样式只对当前 .vue 文件有效，不会污染其他组件。
  ============================================================
*/

/* 整个页面容器：横向分左右两栏 */
 .chat-container {
   display: flex;            /* Flex 弹性布局，子元素横向排列 */
   height: 100vh;            /* 高度 = 整个浏览器窗口的高度 */
   background: linear-gradient(to right, #bae6fd 40%, #fecdd3 100%);
    /*          ↑ 从左到右：浅蓝 → 浅粉渐变（蓝色占40%，粉色占60%）*/
 }

/* ============================================================
   【修改】侧边栏：增加圆角与外层间距
   ============================================================ */
.sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.55);   /* 半透明白色，让背景渐变透出来 */
  backdrop-filter: blur(8px);               /* 毛玻璃效果：模糊背景 */
  -webkit-backdrop-filter: blur(8px);
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-radius: 0 16px 16px 0;
}

/* ============================================================
   【修改】侧边栏头部：头像 + 用户名布局，头像带动态光晕特效
   ============================================================ */
.sidebar-header {
  padding: 24px 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* 头像外层包裹，用于实现动态光晕 */
.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar-wrapper::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #fda4af, #a78bfa, #60a5fa, #fda4af);
  animation: avatar-glow 3s linear infinite;
  z-index: 0;
}

.avatar-wrapper::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);    /* 和侧边栏背景统一，保证光晕环内不突兀 */
  backdrop-filter: blur(8px);
  z-index: 0;
}

.user-avatar {
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, #fda4af 0%, #a78bfa 100%);
  color: #fff;
  font-weight: 600;
  font-size: 18px;
}

/* 头像光晕旋转动画 */
@keyframes avatar-glow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-status {
  font-size: 12px;
  color: #67c23a;
}

.user-status::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #67c23a;
  margin-right: 6px;
  vertical-align: middle;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

/* 在线状态点脉动动画 */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

/* ============================================================
   【修改】侧边栏菜单区域
   ============================================================ */
.sidebar-menu {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-label {
  font-size: 12px;
  color: #909399;
  padding-left: 8px;
}

/* ============================================================
   【修改】新对话按钮：圆角 + 渐变背景
   ============================================================ */
.new-chat-btn {
  width: 100%;
  background: linear-gradient(135deg, #fda4af, #a78bfa);
  border: none;
  color: #fff;
  font-weight: 500;
  transition: all 0.3s ease;
}

.new-chat-btn:hover {
  background: linear-gradient(135deg, #fb929e, #9b7ff0);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(253, 164, 175, 0.4);
}

/* ============================================================
   【修改】岗位选择按钮：圆角 + 展开箭头
   ============================================================ */
.position-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 10px 16px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  color: #303133;
  font-size: 14px;
  transition: all 0.3s ease;
}

.position-btn:hover {
  border-color: #fda4af;
  background: #fef0f0;
}

.position-btn .arrow-icon {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
  transition: transform 0.3s ease;
}

/* 岗位选择弹出菜单 */
.position-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.position-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
  transition: all 0.2s ease;
}

.position-item:hover {
  background: #fef0f0;
  color: #fda4af;
}

.position-item.active {
  background: linear-gradient(135deg, #fef0f0, #fdf2f8);
  color: #f472b6;
  font-weight: 500;
}

.check-icon {
  color: #f472b6;
}

/* ============================================================
   【新增】功能按钮（题库导入、成绩报告、难度选择）
   ============================================================ */
.feature-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.45);    /* 半透明白色，比侧边栏更透 */
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #606266;
  font-size: 14px;
  font-weight: normal;
  transition: all 0.3s ease;
}

.feature-btn:hover {
  border-color: #a78bfa;
  color: #a78bfa;
  background: #faf5ff;
  transform: translateX(2px);
}

/* ============================================================
   【修改】侧边栏底部：切换账号 + 退出登录纵向排列
   ============================================================ */
.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-btn {
  width: 100%;
  justify-content: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #606266;
  transition: all 0.2s ease;
}

.footer-btn:hover {
  background: #f5f7fa;
  color: #303133;
}

/* ============================================================
   【修改】主聊天区
   ============================================================ */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: transparent;   /* 透明，让 .chat-container 的渐变直接穿透 */
}

.chat-header {
  height: 56px;
  background: rgba(255, 255, 255, 0.55);    /* 半透明白色，透出底部渐变 */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.chat-title {
  font-size: 15px;
  color: #303133;
  font-weight: 500;
}

/* 消息列表 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  gap: 12px;
}

.empty-icon {
  color: #c0c4cc;
  margin-bottom: 8px;
}

.quick-questions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}

.quick-tag {
  cursor: pointer;
  border-radius: 20px;
  transition: all 0.2s;
}

.quick-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(253, 164, 175, 0.3);
}

/* 单条消息 */
.message-item {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message-item.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-item.ai {
  align-self: flex-start;
}

.ai-avatar {
  background: linear-gradient(135deg, #fda4af, #a78bfa);
}

.message-content {
  background: rgba(255, 255, 255, 0.75);    /* 半透明白色气泡，保留可读性 */
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.message-item.user .message-content {
  background: linear-gradient(135deg, #fda4af, #e58ca0);
  color: #fff;
}

.message-role {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.message-item.user .message-role {
  color: rgba(255, 255, 255, 0.8);
}

.message-text {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-time {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 6px;
  text-align: right;
}

.message-item.user .message-time {
  color: rgba(255, 255, 255, 0.6);
}

/* 打字动画 */
.typing-dots {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) { animation-delay: 0s; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* ============================================================
   【修改】输入区域整体
   ============================================================ */
.chat-input-area {
  padding: 12px 24px 16px;
  background: rgba(255, 255, 255, 0.55);    /* 半透明白色，透出底部渐变 */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

/* 【修改】文本框：圆角 + 自适应高度 */
.chat-textarea {
  flex: 1;
}

.chat-textarea :deep(.el-textarea__inner) {
  border-radius: 20px;
  padding: 10px 18px;
  background: #f5f7fa;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  font-size: 14px;
  line-height: 1.6;
}

.chat-textarea :deep(.el-textarea__inner):focus {
  border-color: #fda4af;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(253, 164, 175, 0.15);
}

/* ============================================================
   【修改】发送按钮：与新对话按钮统一渐变样式（#fda4af → #a78bfa）
   ============================================================ */
.send-btn-glass {
  height: 42px;
  flex-shrink: 0;
  padding: 0 24px;
  font-weight: 500;
  font-size: 14px;
  /* 【修改】背景改为与新对话按钮一致的渐变 */
  background: linear-gradient(135deg, #fda4af, #a78bfa);
  border: none;
  color: #fff;
  box-shadow: 0 4px 12px rgba(253, 164, 175, 0.3);
  transition: all 0.3s ease;
}

.send-btn-glass:hover:not(:disabled) {
  /* 【修改】hover 改为与新对话按钮一致 */
  background: linear-gradient(135deg, #fb929e, #9b7ff0);
  box-shadow: 0 6px 20px rgba(253, 164, 175, 0.45);
  transform: translateY(-1px);
}

.send-btn-glass:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn-glass.is-disabled {
  background: #c0c4cc;
  border: none;
  color: #fff;
}

/* ============================================================
   【新增】底部工具栏：相机、相册、录音、上传文件
   ============================================================ */
.toolbar {
  display: flex;
  gap: 8px;
  padding-left: 4px;
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  color: #909399;
  border: 1px solid #e4e7ed;
  background: #fafafa;
  transition: all 0.3s ease;
}

.toolbar-btn:hover {
  color: #fda4af;
  border-color: #fda4af;
  background: #fef0f0;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(253, 164, 175, 0.25);
}
</style>
