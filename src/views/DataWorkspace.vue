<template>
  <div class="split-2-1">
    <!-- ===== 第一行：KPI 条（整宽） =====
         练习记录 / 考试记录两页用「练习自己的数据卡」替代
         今日面试 / 面试总数 / 简历数量 / 平均评分 这四个面试指标 -->
    <PracticeKpiBar
      v-if="activeItem === 'practiceRecords' || activeItem === 'examRecords'"
      class="span-3"
      :mode="activeItem === 'examRecords' ? 'exams' : 'practice'"
    />
    <KpiBar v-else class="span-3" />

    <template v-if="activeItem === 'overview'">
      <!-- ===== 第二行：趋势图 2 列 + 能力维度 1 列 ===== -->
      <TrendChart class="span-2" title="面试趋势 · 近 7 天" />
      <AbilityBars title="能力维度" />

      <!-- ===== 题库练习 / 模拟考试：进度、次数、饼图与折线图 ===== -->
      <PracticeSummary class="span-3" />

      <!-- ===== 第三行：三图并排，各占一列 ===== -->
      <RadarChart title="能力画像" />
      <ScoreLine title="成长趋势 · 每场平均分" />
      <ScoreRing title="评分分布" />

      <!-- ===== 第四行：记录表整宽 ===== -->
      <RecordsTable class="span-3" title="面试记录" />
    </template>

    <!-- ===== 题库练习记录（按填写时间分组、可筛选） ===== -->
    <PracticeRecordsPanel v-else-if="activeItem === 'practiceRecords'" mode="practice" class="span-3" />

    <!-- ===== 模拟考试记录（按填写时间分组、可筛选） ===== -->
    <PracticeRecordsPanel v-else-if="activeItem === 'examRecords'" mode="exams" class="span-3" />

    <!-- ===== 面试记录分页：表格整宽 ===== -->
    <RecordsTable v-else class="span-3" title="全部面试记录" />
  </div>
</template>

<script setup>
import KpiBar from '@/components/blocks/KpiBar.vue'
import TrendChart from '@/components/blocks/TrendChart.vue'
import AbilityBars from '@/components/blocks/AbilityBars.vue'
import RadarChart from '@/components/blocks/RadarChart.vue'
import ScoreLine from '@/components/blocks/ScoreLine.vue'
import ScoreRing from '@/components/blocks/ScoreRing.vue'
import RecordsTable from '@/components/blocks/RecordsTable.vue'
import PracticeSummary from '@/components/blocks/PracticeSummary.vue'
import PracticeRecordsPanel from '@/components/blocks/PracticeRecordsPanel.vue'
import PracticeKpiBar from '@/components/blocks/PracticeKpiBar.vue'
import { activeItem } from '@/theme/workspace.js'
</script>
