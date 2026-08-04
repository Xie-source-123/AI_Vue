// ============================================================
// router/index.js — 前端路由配置（页面导航的"地图"）
// 通俗理解：这个文件定义了"用户在浏览器地址栏输入什么路径，就显示什么页面"。
// 就像商场里的楼层指引： /login → 登录页, /register → 注册页, /chat → 聊天页
// ============================================================

// 1) 从 vue-router 库中引入两个核心函数
//    createRouter      — 创建路由器（相当于制造一个"导航仪"）
//    createWebHistory  — 使用 HTML5 的 History 模式（URL 看起来更干净，没有 # 号）
import { createRouter, createWebHistory } from 'vue-router'

// 2) 定义路由表（routes）
//    这是一个数组，每一项代表一个页面路径的规则
//    数组 = 列表，就像一份"菜单"
const routes = [
  // --- 规则 1：根路径 / 自动跳转到登录页 ---
  {
    path: '/',             // 用户访问的路径（浏览器地址栏里 / 后面的部分）
    redirect: '/login'     // 重定向：浏览器自动跳到 /login 这个地址
    // 效果：用户打开网站首页，就直接看到登录页面
  },

  // --- 规则 2：登录页面 ---
  {
    path: '/login',        // 访问地址，如 http://localhost:5173/login
    name: 'Login',         // 路由名称（给这条规则起的名字，方便代码中引用）
    // component 指定这个路径要显示的 Vue 组件（页面）
    // 这里用了"懒加载"写法 () => import('...')，好处是：
    //   用户没访问这个页面时，浏览器不会下载它的代码，
    //   等用户真的点进来才去加载，这样网站一开始打开更快
    component: () => import('@/views/LoginView.vue')
    //         ↑ @ 是一个别名，在 vite.config.js 里配置的，代表 src 目录
  },

  // --- 规则 3：注册页面 ---
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue')
  },

  // --- 规则 4：聊天页面（AI 面试主界面）---
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue')
  }
]

// 3) 创建路由器实例
//    把上面定义好的路由规则传入，并指定使用 History 模式
const router = createRouter({
  history: createWebHistory(),
  //     ↑ History 模式：URL 是 http://xxx.com/login 这种干净格式
  //     另一种模式叫 Hash 模式，URL 是 http://xxx.com/#/login（带 # 号）
  routes  // 把定义好的路由表传给路由器
})

// 4) 导出路由器
//    导出去后，在 main.js（程序入口）中引入并使用
export default router
