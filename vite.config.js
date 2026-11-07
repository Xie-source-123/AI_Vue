import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // 编辑器/工具链的原子写会留下临时目录，监听到会抛 EBUSY 并打挂进程
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.*.tmpdir/**',
        '**/*.tmp',
      ],
    },
  },
})
