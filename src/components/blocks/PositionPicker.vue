<template>
  <div class="card card-hero pos-picker">
    <h4 v-if="title">{{ title }}</h4>
    <div class="grid">
      <!-- 选中后给该卡加跑马灯，作为「已选定」的强调。
           注意不要用 !modelValue 判断「未选择」—— 父组件 InterviewWorkspace 的
           position 有默认值（'数据开发工程师' 兜底），永远非空，
           那个判断恒为 false，跑马灯一次都不会出现。 -->
      <button
        v-for="p in options"
        :key="p.value"
        class="pos-card press-lg focus-ring"
        :class="{ on: modelValue === p.value, 'flow-border': modelValue === p.value }"
        @click="pick(p.value)"
      >
        <span class="ic">{{ p.icon }}</span>
        <b class="name">{{ p.label }}</b>
        <span class="desc">{{ p.desc }}</span>
        <span class="dot" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="11" height="11">
            <path
              d="M3.4 8.4l3 3 6.2-7"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchPublicPositionsAPI } from '@/api/admin.js'

defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

/* 兜底列表：后端拿不到时用它，界面不至于变成空白。
   内容与管理后台「岗位管理」里的初始值保持一致。 */
const FALLBACK = [
  {
    value: '数据开发工程师',
    icon: '▦',
    label: '数据开发工程师',
    desc: 'ETL、调度、数仓建模与性能调优'
  },
  {
    value: 'Linux服务器工程师',
    icon: '⌘',
    label: 'Linux 服务器工程师',
    desc: '系统运维、排查排障与自动化脚本'
  },
  {
    value: '前端工程师',
    icon: '◫',
    label: '前端工程师',
    desc: '组件设计、渲染性能与工程化'
  },
  {
    value: '算法工程师',
    icon: '◍',
    label: '算法工程师',
    desc: '模型选型、特征工程与效果评估'
  }
]

/* 岗位列表改从后端读。
   原来这四个是硬编码在这个文件里的 —— 那样管理后台的「岗位管理」
   改了岗位这里纹丝不动，等于管理功能是假的。 */
const options = ref(FALLBACK)

async function loadPositions() {
  try {
    const { data } = await fetchPublicPositionsAPI()
    if (Array.isArray(data?.positions) && data.positions.length) {
      options.value = data.positions
    }
  } catch {
    /* 后端没起来时保持兜底列表。
       岗位选择是「开始面试」的前置步骤，这里整块空掉会让人以为功能坏了，
       而实际上只是接口暂时不可达。 */
  }
}

onMounted(loadPositions)

const pick = (value) => emit('update:modelValue', value)
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.pos-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  text-align: left;
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
  border: 1px solid var(--hairline);
  border-radius: var(--rad-block);
  cursor: pointer;
  transition: var(--slide-trans);
}

/* 悬停只改边框、不动底色 —— 与选中态明确区分（原来两者长得几乎一样） */
.pos-card:hover {
  border-color: var(--accent);
}

/* 选中：边框 + 柔光 + 弹动一次。
   animation 在 .on 加上时触发；重复点已选中的卡片不会重放（符合预期）。 */
.pos-card.on {
  border-color: var(--accent);
  background: var(--surface);
  /* 内高光必须一起写：.on 的 box-shadow 会覆盖基础态的内高光 */
  box-shadow: inset 0 1px 0 var(--inset-sheen), 0 0 0 3px var(--accent-glow);
  animation: pos-pop 0.32s var(--ease-out);
}

@keyframes pos-pop {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.035);
  }
  100% {
    transform: scale(1);
  }
}

/* 图标加圆角底色块，选中时整块转草木青 */
.ic {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rad-sm);
  background: var(--inset-glass);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
  border: 1px solid var(--hairline);
  font-size: 18px;
  line-height: 1;
  color: var(--accent);
  transition: var(--slide-trans);
}

.pos-card.on .ic {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.desc {
  font-size: 11px;
  line-height: 1.5;
  color: var(--body-muted);
}

/* 勾选圈：选中后填充并打勾。用内联 SVG 画勾，比 border 旋转拼出来的更精确。 */
.dot {
  position: absolute;
  right: 14px;
  top: 14px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--hairline-strong);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-ink);
  transition: var(--slide-trans);
}

.dot svg {
  transform: scale(0);
  transition: transform var(--dur-base) var(--ease-out);
}

.pos-card.on .dot {
  background: var(--accent);
  border-color: var(--accent);
}

.pos-card.on .dot svg {
  transform: scale(1);
}

@media (max-width: 1280px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 700px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
