import { ref } from 'vue'

/**
 * 最近一次「提交面试」的结果。
 *
 * 会话区（InterviewChat）提交后写入，右侧评分卡（AbilityBars）读取它来决定
 * 是否展示「生成评分报告」—— 做成模块级响应式 ref，两个兄弟组件即可自动同步，
 * 不需要 props 层层传递或事件总线。
 */
export const submitted = ref(null)

/**
 * 把对话整理成面试结果。
 *
 * 消息结构是交替的 user / ai，ai 消息上可能带 score（来自 SSE 的 chunk.score）。
 * 这里把「一条提问 + 一条带评分的回答」配成一轮问答。
 */
export function summarizeMessages(messages) {
  const qa = []
  let lastQuestion = ''

  for (const m of messages || []) {
    if (m.role === 'user') {
      lastQuestion = m.content
    } else if (m.score != null && !Number.isNaN(Number(m.score))) {
      qa.push({
        question: lastQuestion,
        answer: m.content,
        score: Number(m.score)
      })
    }
  }

  const scores = qa.map((x) => x.score)
  return {
    rounds: qa.length,
    avg: scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null,
    qa
  }
}

export function clearSubmitted() {
  submitted.value = null
}

export default { submitted, summarizeMessages, clearSubmitted }
