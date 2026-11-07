# AI_Vue

AI 模拟面试平台的**前端**（Vue 3 + Vite + Element Plus + ECharts）。

## 环境要求

- **Node.js `^22.18.0` 或 `>=24.12.0`**（版本要求写在 `package.json` 的 `engines` 里）

## 快速启动

```bash
npm install
npm run dev
```

打开终端提示的地址（默认 http://localhost:5173）。

> ⚠️ **必须先启动后端** `a05_backend`（跑在 `http://localhost:8000`），
> 否则页面能打开但所有数据都是空的。
> 后端仓库：https://github.com/Xie-source-123/a05_backend

## 构建

```bash
npm run build     # 产物在 dist/
npm run preview   # 本地预览构建结果
```

## 与后端的连接

前端把后端地址写死为 `http://localhost:8000`，分布在以下位置：

| 文件 | 用途 |
|---|---|
| `src/api/index.js` | 主接口封装（注册、登录、对话、报告、题库、练习记录） |
| `src/api/admin.js` | 管理后台接口 |
| `src/components/blocks/InterviewChat.vue` | 对话流式输出、语音合成 |
| `src/components/blocks/AbilityBars.vue` | 能力报告生成 |

如果后端换了地址或端口，需要同步修改这几处。

## 后端 CORS

后端只放行 `5173 / 5174` 两个端口。如果本机 5173 被占用、Vite 自动换到 5175，
浏览器会拦截所有请求。解决办法：

```bash
npm run dev -- --port 5173 --strictPort
```

或者去后端 `main.py` 的 `CORSMiddleware` 里加上新端口。

## 目录结构

```
src/
  api/          接口封装
  assets/       全局样式与图片
  components/   通用组件（含 blocks/ 工作台区块）
  router/       路由
  theme/        工作台导航、界面配色主题
  utils/        工具函数（本地存储、指标计算等）
  views/        页面（首页、工作台、管理后台）
```

## 常见问题

**`npm install` 报 Node 版本不符**
升级 Node 到 22.18+ 或 24.12+。

**页面空白、控制台报接口失败**
先确认后端在 8000 端口运行中（浏览器直接访问 http://127.0.0.1:8000/docs 能否打开）。

**改了代码页面不更新**
Vite 的编译缓存偶尔会卡在中间状态，重启 `npm run dev` 即可。