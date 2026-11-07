import { createRouter, createWebHistory } from 'vue-router'
import { isAdminLoggedIn } from '@/utils/adminSession.js'

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: () => import('@/views/WelcomeView.vue')
  },
  {
    path: '/login',
    redirect: '/'
  },
  {
    path: '/register',
    redirect: '/'
  },
  {
    /* 旧营销页已废除，统一到新落地页 */
    path: '/landing',
    redirect: '/'
  },

  /* ===== 三栏工作台 ===== */
  {
    path: '/app',
    component: () => import('@/views/WorkspaceLayout.vue'),
    redirect: '/app/interview',
    children: [
      {
        path: 'interview',
        name: 'InterviewWorkspace',
        component: () => import('@/views/InterviewWorkspace.vue')
      },
      {
        path: 'data',
        name: 'DataWorkspace',
        component: () => import('@/views/DataWorkspace.vue')
      },
      {
        path: 'me',
        name: 'MeWorkspace',
        component: () => import('@/views/MeWorkspace.vue')
      },

      /* 旧路由保留重定向，避免外部链接失效 */
      { path: 'dashboard', redirect: '/app/data' },
      { path: 'records', redirect: '/app/data' },
      { path: 'profile', redirect: '/app/me' },
      { path: 'questions', redirect: '/app/interview' },
      { path: 'resume', redirect: '/app/interview' },
      { path: 'chat', redirect: '/app/interview' }
    ]
  },

  /* ===== 管理后台 =====
     刻意与 /app 完全分离：它有自己的导航（长侧栏，不是图标条）、
     自己的登录态（admin_token，不是 token），以及自己的守卫。
     塞进 /app 那套三栏外壳里，反而要为「管理员和普通用户看到的东西不一样」
     到处加分支。 */
  {
    path: '/admin',
    component: () => import('@/views/AdminLayout.vue'),
    redirect: '/admin/overview',
    meta: { requiresAdmin: true },
    children: [
      {
        path: 'overview',
        name: 'AdminOverview',
        component: () => import('@/views/admin/AdminOverview.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/AdminUsers.vue')
      },
      {
        path: 'positions',
        name: 'AdminPositions',
        component: () => import('@/views/admin/AdminPositions.vue')
      },
      {
        path: 'questions',
        name: 'AdminBanks',
        component: () => import('@/views/admin/AdminBanks.vue')
      },
      {
        path: 'system',
        name: 'AdminSystem',
        component: () => import('@/views/admin/AdminSystem.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/* 后台守卫。
   注意它挡的是「没登录就进来看看」这种误入，不是攻击 ——
   本地存的 admin_token 谁都能伪造，真正拦住越权的是后端的 require_admin。
   没有这层守卫的话，未登录用户会看到一个空壳后台，然后被满屏 401 打回去。 */
router.beforeEach((to) => {
  if (to.meta.requiresAdmin && !isAdminLoggedIn()) return '/'
  return true
})

export default router
