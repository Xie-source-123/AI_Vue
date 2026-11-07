import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/main.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router/index'
import { initUiTheme } from './theme/uiTheme.js'
import { fetchPublicUiThemeAPI } from './api/admin.js'

const app = createApp(App)

// 界面配色：必须在 mount 之前调一次 —— 它会先吃本地缓存同步上色，
// 避免首屏先按 base.css 默认色画一遍再跳成自定义色（会闪一下）。
// 后端拉取是异步的，失败也不影响（保持缓存/默认值）。
initUiTheme(() => fetchPublicUiThemeAPI().then((res) => res.data))

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(router)
app.mount('#app')
