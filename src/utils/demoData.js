/**
 * 演示数据：用于在本地预览数据工作台、简历管理等界面的满状态效果。
 * 所有记录的 id 均以 demo- 开头，重复载入会先清掉旧的演示数据，不影响真实记录。
 */
import { getUserItem, setUserItem } from './userStorage.js'

const DAY = 86400000
const HOUR = 3600000
const PREFIX = 'demo-'

const POSITIONS = [
  '数据开发工程师',
  'Linux服务器工程师',
  '大数据平台工程师',
  '数据仓库工程师',
  '运维开发工程师',
  '算法工程师'
]

const QUESTIONS = [
  '请介绍一下你在数据开发方面的主要经验。',
  '说说你处理过的最棘手的一次线上问题。',
  'SQL 优化的常见手段有哪些？',
  '你如何设计一张千万级的事实表？',
  '聊聊你对数据仓库分层的理解。',
  'Linux 上排查 CPU 飙高的思路是什么？',
  '你们团队是怎么保障数据质量的？',
  '一个跑批任务超时了，你会怎么定位？',
  '描述一次你主导的技术方案落地过程。',
  '你觉得自己在这个岗位上最大的短板是什么？'
]

const REPLIES = [
  '回答结构清晰，先讲了背景再讲方案，能落到具体指标上。',
  '思路方向正确，但缺少量化的结果，建议补充数据支撑。',
  '对原理的理解到位，追问后依然能自洽，追问深度可以再加一层。',
  '回答偏笼统，建议用 STAR 结构把场景、任务、行动、结果讲完整。',
  '技术细节扎实，能主动提到取舍与边界情况，表现不错。',
  '有几个概念说得不够准确，建议回去把这块的基础再夯实一下。',
  '能把经验迁移到新场景，说明理解是成体系的。',
  '表达略啰嗦，重点被埋住了，建议先给结论再展开。'
]

/* [几天前, 几点, 岗位下标, 各轮得分] */
const PLAN = [
  [13, 10, 1, [48, 52, 50]],
  [12, 15, 0, [65, 68, 66]],
  [10, 11, 4, [52, 55, 50]],
  [8, 16, 2, [60, 57, 62]],
  [6, 9, 0, [69, 72, 71]],
  [6, 18, 3, [86, 83, 89]],
  [5, 14, 1, [63, 67, 60]],
  [4, 20, 5, [74, 71, 78]],
  [3, 13, 2, [55, 58, 52]],
  [2, 10, 0, [80, 84, 82]],
  [1, 16, 4, [66, 61, 68]],
  [0, 11, 3, [72, 76, 70]],
  [0, 17, 0, [88, 90, 85]]
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function stamp(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

export function buildDemoRecords(now = Date.now()) {
  const base = new Date(now)
  base.setHours(0, 0, 0, 0)
  const baseTs = base.getTime()

  return PLAN.map(([daysAgo, hour, posIdx, scores], i) => {
    const ts = baseTs - daysAgo * DAY + hour * HOUR
    const position = POSITIONS[posIdx]
    const messages = []
    scores.forEach((score, r) => {
      messages.push({ role: 'user', content: QUESTIONS[(i * 3 + r) % QUESTIONS.length] })
      messages.push({
        role: 'ai',
        content: `第 ${r + 1} 轮：${REPLIES[(i + r) % REPLIES.length]}`,
        score
      })
    })
    return {
      id: `${PREFIX}rec-${i}`,
      date: new Date(ts).toISOString(),
      position,
      name: `面试记录_${stamp(ts)}`,
      messages
    }
  })
}

export function buildDemoAiRecords(now = Date.now()) {
  return [
    {
      id: `${PREFIX}ai-1`,
      name: '简历_数据开发_v1',
      scores: { 优势: 62, 不足: 71, 岗位匹配: 55 },
      time: now - 20 * DAY
    },
    {
      id: `${PREFIX}ai-2`,
      name: '简历_数据开发_v2',
      scores: { 优势: 74, 不足: 58, 岗位匹配: 66 },
      time: now - 9 * DAY
    },
    {
      id: `${PREFIX}ai-3`,
      name: '简历_数据开发_v3',
      scores: { 优势: 88, 不足: 42, 岗位匹配: 79 },
      time: now - 2 * DAY
    }
  ]
}

export function buildDemoResumes(now = Date.now()) {
  return [
    {
      id: `${PREFIX}res-1`,
      title: '数据开发_张一鸣',
      name: '张一鸣',
      gender: '男',
      age: '26',
      phone: '13800001111',
      school: '某某大学',
      photo: '',
      resume: '三年数据开发经验，负责过日增十亿级的事实表建设与调度治理。',
      schoolExperience: '校级科技竞赛二等奖，担任数据方向负责人。',
      workExperience: '负责离线数仓分层重构，核心链路产出时间从 06:00 提前到 04:30。',
      projectExperience: '主导实时数仓 POC，Flink + ClickHouse 落地，查询延迟降至秒级。',
      skillProficiency: 'SQL 熟练 / Hadoop 熟练 / Flink 掌握 / Python 掌握',
      jobIntention: '数据开发工程师',
      customModules: [{ title: '获奖证书', content: '大数据竞赛省级二等奖' }],
      savedAt: now - 5 * DAY,
      aiAnalyzed: true
    },
    {
      id: `${PREFIX}res-2`,
      title: '运维开发_李思',
      name: '李思',
      gender: '女',
      age: '24',
      phone: '13800002222',
      school: '某某理工大学',
      photo: '',
      resume: '专注 Linux 运维与自动化建设，熟悉监控告警体系与容量规划。',
      schoolExperience: '校内开源社团核心成员。',
      workExperience: '搭建 Prometheus + Grafana 监控体系，覆盖 300+ 实例。',
      projectExperience: '基于 Ansible 的批量部署平台，发布耗时从 40 分钟降到 6 分钟。',
      skillProficiency: 'Linux 熟练 / Shell 熟练 / K8s 掌握 / Python 掌握',
      jobIntention: 'Linux服务器工程师',
      customModules: [],
      savedAt: now - 2 * DAY,
      aiAnalyzed: false
    },
    {
      id: `${PREFIX}res-3`,
      title: '数据仓库_王梧',
      name: '王梧',
      gender: '男',
      age: '28',
      phone: '13800003333',
      school: '某某交通大学',
      photo: '',
      resume: '五年数仓建模经验，擅长维度建模与数据治理。',
      schoolExperience: '—',
      workExperience: '负责集团指标口径统一，口径争议下降约七成。',
      projectExperience: '设计保单域维度模型，支撑 20+ 下游报表。',
      skillProficiency: '建模 熟练 / SQL 熟练 / 数据治理 掌握',
      jobIntention: '数据仓库工程师',
      customModules: [],
      savedAt: now - 1 * DAY,
      aiAnalyzed: false
    }
  ]
}

export function buildDemoFiles(now = Date.now()) {
  return [
    {
      id: `${PREFIX}file-1`,
      title: '简历-前端实习-陈默.pdf',
      name: '简历-前端实习-陈默.pdf',
      size: 486000,
      savedAt: now - 3 * DAY
    },
    {
      id: `${PREFIX}file-2`,
      title: '简历-测试开发-赵岚.docx',
      name: '简历-测试开发-赵岚.docx',
      size: 128000,
      savedAt: now - 1 * DAY
    }
  ]
}

function readList(key) {
  try {
    const v = JSON.parse(getUserItem(key) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function writeList(key, list) {
  setUserItem(key, JSON.stringify(list))
}

/** 保留真实数据，仅替换演示数据 */
function merge(key, demoList) {
  const real = readList(key).filter((it) => !String(it?.id || '').startsWith(PREFIX))
  writeList(key, [...demoList, ...real])
  return demoList.length
}

/** 载入演示数据，返回写入的面试场次数量 */
export function seedDemoData(now = Date.now()) {
  const count = merge('interview_records', buildDemoRecords(now))
  merge('ai_analysis_records', buildDemoAiRecords(now))
  merge('saved_resumes', buildDemoResumes(now))
  merge('uploaded_files', buildDemoFiles(now))
  return count
}

/** 移除演示数据，返回是否实际清掉了内容 */
export function clearDemoData() {
  let removed = 0
  ;['interview_records', 'ai_analysis_records', 'saved_resumes', 'uploaded_files'].forEach(
    (key) => {
      const all = readList(key)
      const real = all.filter((it) => !String(it?.id || '').startsWith(PREFIX))
      removed += all.length - real.length
      writeList(key, real)
    }
  )
  return removed
}

export default { seedDemoData, clearDemoData }
