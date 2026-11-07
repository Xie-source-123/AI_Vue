<template>
  <div class="split-2-1">
    <!-- ===== 模拟面试：岗位整宽 → 会话 2/3 + 实时评分 1/3 ===== -->
    <template v-if="activeItem === 'session'">
      <PositionPicker v-model="position" class="span-3" title="选择面试岗位" />
      <InterviewChat class="span-2" title="面试会话" :position="position" />
      <AbilityBars title="实时评分" allow-report />
    </template>

    <!-- ===== 历史记录：整宽表格（可点开查看完整问答） ===== -->
    <HistoryRecords v-else-if="activeItem === 'history'" class="span-3" title="历史记录" />

    <!-- ===== 题库练习：逐题作答，交卷看参考答案与点评 ===== -->
    <PracticeView v-else-if="activeItem === 'practice'" class="span-3" />

    <!-- ===== 模拟考试：随机抽 20 题，交卷后统一评分 ===== -->
    <ExamView v-else-if="activeItem === 'exam'" class="span-3" />

    <!-- ===== 简历管理：由 ResumeView 直接产出网格项 ===== -->
    <template v-else>
      <ResumeView />
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PositionPicker from '@/components/blocks/PositionPicker.vue'
import InterviewChat from '@/components/blocks/InterviewChat.vue'
import AbilityBars from '@/components/blocks/AbilityBars.vue'
import HistoryRecords from '@/components/blocks/HistoryRecords.vue'
import ResumeView from '@/views/ResumeView.vue'
import PracticeView from '@/components/blocks/PracticeView.vue'
import ExamView from '@/components/blocks/ExamView.vue'
import { activeItem } from '@/theme/workspace.js'
import { getUserItem } from '@/utils/userStorage.js'

const position = ref(getUserItem('selectedPosition') || '数据开发工程师')
</script>
