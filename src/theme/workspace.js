import { ref } from 'vue'
import { ChatLineSquare, Odometer, User } from '@element-plus/icons-vue'

/**
 * 三个工作台：左侧图标条切换工作台，第二栏列出该工作台内的条目。
 */
export const WORKSPACES = [
  {
    key: 'interview',
    label: '面试',
    title: '面试工作台',
    icon: ChatLineSquare,
    path: '/app/interview',
    cta: '新建面试',
    groups: [
      {
        label: '会话',
        items: [
          { key: 'session', label: '模拟面试', sub: '选岗位后开始提问与打分' },
          { key: 'history', label: '历史记录', sub: '回看每次面试的问答与评分' }
        ]
      },
      {
        label: '练习',
        items: [
          { key: 'practice', label: '题库练习', sub: '逐题作答，看参考答案与点评' },
          { key: 'exam', label: '模拟考试', sub: '随机抽 20 题，交卷自动评分' }
        ]
      },
      {
        label: '资料',
        items: [
          { key: 'resume', label: '简历管理', sub: '上传或录入，生成 AI 分析' }
        ]
      }
    ]
  },
  {
    key: 'data',
    label: '数据',
    title: '数据工作台',
    icon: Odometer,
    path: '/app/data',
    cta: '导出报表',
    groups: [
      {
        label: '看板',
        items: [
          { key: 'overview', label: '总览', sub: 'KPI 指标与面试趋势' },
          { key: 'records', label: '面试记录', sub: '全部历史记录与明细' }
        ]
      },
      {
        label: '练习',
        items: [
          { key: 'practiceRecords', label: '练习记录', sub: '按填写时间分组' },
          { key: 'examRecords', label: '考试记录', sub: '成绩与逐题明细' }
        ]
      }
    ]
  },
  {
    key: 'me',
    label: '个人',
    title: '个人中心',
    icon: User,
    path: '/app/me',
    cta: '保存修改',
    groups: [
      {
        label: '账户',
        items: [
          { key: 'profile', label: '个人资料', sub: '头像、昵称与求职信息' },
          { key: 'prefs', label: '偏好设置', sub: '主题、语言与数据' }
        ]
      }
    ]
  }
]

export const WORKSPACE_MAP = WORKSPACES.reduce((acc, w) => {
  acc[w.key] = w
  return acc
}, {})

/** 当前选中的条目 key（跨组件共享） */
export const activeItem = ref('session')

/**
 * 跨工作台跳转时的目标条目。
 * WorkspaceLayout 切换工作台时默认选中第一项，此处用于指定落点（消费后清空）。
 */
export const pendingItem = ref(null)

/** 第二栏搜索词 */
export const query = ref('')

/** 根据路由名取工作台 key */
export const ROUTE_WORKSPACE = {
  InterviewWorkspace: 'interview',
  DataWorkspace: 'data',
  MeWorkspace: 'me'
}

export function workspaceOf(routeName) {
  return WORKSPACE_MAP[ROUTE_WORKSPACE[routeName]] || WORKSPACE_MAP.interview
}

/** 取某工作台内某个条目的信息 */
export function findItem(wsKey, itemKey) {
  const ws = WORKSPACE_MAP[wsKey]
  if (!ws) return null
  for (const g of ws.groups) {
    const hit = g.items.find((i) => i.key === itemKey)
    if (hit) return hit
  }
  return null
}

export default { WORKSPACES, WORKSPACE_MAP, activeItem, pendingItem, query, workspaceOf, findItem }
