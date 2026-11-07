<template>
  <section class="card ps">
    <div class="ps-head">
      <span class="tech-section">题库练习与模拟考试</span>
      <el-button link type="primary" size="small" :loading="loading" @click="load">刷新</el-button>
    </div>

    <div v-if="error" class="ps-empty">{{ error }}</div>
    <div v-else-if="loading && !loaded" class="ps-empty">正在统计…</div>
    <div v-else-if="!hasAny" class="ps-empty">
      还没有练习或考试记录 —— 去「面试工作台 → 题库练习」做几题就会出现在这里。
    </div>

    <template v-else>
      <!-- 三个大数字 -->
      <div class="ps-kpi">
        <div class="ps-kpi-item">
          <span class="ps-kpi-label">总题库练习进度</span>
          <span class="ps-kpi-value">{{ overall.percent }}<small>%</small></span>
          <span class="ps-kpi-sub">答对 {{ overall.correct }} / {{ overall.questions }} 题</span>
        </div>
        <div class="ps-kpi-item">
          <span class="ps-kpi-label">模拟考试</span>
          <span class="ps-kpi-value">{{ exam.count }}<small>次</small></span>
          <span class="ps-kpi-sub">平均 {{ exam.avgScore }} 分</span>
        </div>
        <div class="ps-kpi-item">
          <span class="ps-kpi-label">已练知识点</span>
          <span class="ps-kpi-value">{{ touched.length }}<small>个</small></span>
          <span class="ps-kpi-sub">共 {{ progress.length }} 个知识点</span>
        </div>
      </div>

      <!-- 各知识点完成度 -->
      <div class="ps-block">
        <div class="ps-block-title">各知识点完成度</div>
        <div class="ps-bars">
          <div v-for="p in progress" :key="p.bank + p.category" class="ps-bar-row">
            <span class="ps-bar-name" :title="`${p.bank} · ${p.category}`">{{ p.category }}</span>
            <span class="ps-bar-track">
              <span class="ps-bar-fill" :style="{ width: p.percent + '%' }" />
            </span>
            <span class="ps-bar-num">{{ p.percent }}%</span>
          </div>
          <div v-if="!progress.length" class="ps-empty-inline">题库里还没有题目</div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchPracticeStatsAPI } from '@/api/index.js'

const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const progress = ref([])
const exam = ref({ count: 0, avgScore: 0, trend: [] })
const overall = ref({ questions: 0, correct: 0, percent: 0 })

const touched = computed(() => progress.value.filter((p) => p.correct > 0))
const answeredAll = computed(() => progress.value.reduce((a, p) => a + p.answered, 0))

const hasAny = computed(
  () => overall.value.correct > 0 || exam.value.count > 0 || answeredAll.value > 0
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await fetchPracticeStatsAPI()
    progress.value = data.progress || []
    exam.value = data.exam || { count: 0, avgScore: 0, trend: [] }
    overall.value = data.overall || { questions: 0, correct: 0, percent: 0 }
    loaded.value = true
  } catch (e) {
    error.value = '统计加载失败：' + (e.response?.data?.detail || e.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ps-empty {
  padding: 34px 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.9;
  color: var(--body-muted);
}
.ps-empty-inline {
  font-size: 12.5px;
  color: var(--body-muted);
  padding: 10px 0;
}
.ps-kpi {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}
.ps-kpi-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  /* 用主题的卡片材质（和 .qbp-card / .a-card 同一套），
     不要用 --canvas-2 —— 那是不透光的灰面，跟主题对不上 */
  background: var(--card-grad);
  backdrop-filter: blur(18px);
}
.ps-kpi-label {
  font-size: 12px;
  color: var(--body-muted);
}
.ps-kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.ps-kpi-value small {
  font-size: 13px;
  margin-left: 2px;
}
.ps-kpi-sub {
  font-size: 11.5px;
  color: var(--body-muted);
}
/* 「各知识点完成度」这一块也套同一层材质，四块视觉才统一 */
.ps-block {
  padding: 14px 16px;
  border-radius: var(--rad-block);
  border: 1px solid var(--hairline);
  background: var(--card-grad);
  backdrop-filter: blur(18px);
}

.ps-block-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--body-muted);
  margin-bottom: 10px;
}
.ps-bars {
  display: flex;
  flex-direction: column;
  gap: 7px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 6px;
}
.ps-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ps-bar-name {
  width: 140px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ps-bar-track {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: var(--hairline);
  overflow: hidden;
}
.ps-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-soft));
  transition: width var(--dur-slow) var(--ease-out);
}
.ps-bar-num {
  width: 44px;
  text-align: right;
  font-size: 11.5px;
  color: var(--body-muted);
  font-variant-numeric: tabular-nums;
}
</style>