import { getUserItem } from './userStorage.js'

export const DAY = 86400000

/** 读本地列表数据，异常一律回落为空数组 */
export function readList(key) {
  try {
    const v = JSON.parse(getUserItem(key) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** 取当天 00:00 的时间戳，非法输入返回 null */
export function dayStart(input) {
  if (input == null) return null
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 单场面试的评分统计：已评分轮次与平均分 */
export function sessionStats(record) {
  const msgs = Array.isArray(record?.messages) ? record.messages : []
  const scored = msgs.filter(
    (m) => m && m.score != null && !Number.isNaN(Number(m.score))
  )
  const avg = scored.length
    ? Math.round(scored.reduce((a, m) => a + Number(m.score), 0) / scored.length)
    : null
  return { rounds: scored.length, avg }
}

/** 全部面试记录，按时间正序，附带轮次与平均分 */
export function sessionList() {
  return readList('interview_records')
    .map((r) => {
      const { rounds, avg } = sessionStats(r)
      const t = new Date(r?.date).getTime()
      return {
        id: r?.id ?? String(t),
        position: r?.position || '未指定岗位',
        name: r?.name || '未命名记录',
        date: Number.isNaN(t) ? null : t,
        rounds,
        avg,
        messages: Array.isArray(r?.messages) ? r.messages : []
      }
    })
    .filter((r) => r.date != null)
    .sort((a, b) => a.date - b.date)
}

/** 简历 AI 分析的最近一次三维评分 */
export function latestAiScores() {
  const list = readList('ai_analysis_records').filter((r) => r && r.scores)
  if (!list.length) return null
  const last = list.slice().sort((a, b) => (b.time || 0) - (a.time || 0))[0]
  return {
    优势: Number(last.scores.优势) || 0,
    不足: Number(last.scores.不足) || 0,
    岗位匹配: Number(last.scores.岗位匹配) || 0
  }
}

/** 简历总数（手动保存 + 本地文件） */
export function resumeList() {
  return [...readList('saved_resumes'), ...readList('uploaded_files')]
}

export function resumeTime(item) {
  return dayStart(item?.savedAt || item?.uploadedAt || item?.time || item?.date)
}

/** 最近 days 天每日面试场次 */
export function dailySessions(days = 7) {
  const today = dayStart(Date.now())
  const start = today - (days - 1) * DAY
  const out = Array(days).fill(0)
  sessionList().forEach((r) => {
    const idx = Math.round((dayStart(r.date) - start) / DAY)
    if (idx >= 0 && idx < days) out[idx] += 1
  })
  return out
}

/** 最近 days 天每日平均分，无数据的当日为 null */
export function dailyAvgScore(days = 7) {
  const today = dayStart(Date.now())
  const start = today - (days - 1) * DAY
  const buckets = Array.from({ length: days }, () => [])
  sessionList().forEach((r) => {
    if (r.avg == null) return
    const idx = Math.round((dayStart(r.date) - start) / DAY)
    if (idx >= 0 && idx < days) buckets[idx].push(r.avg)
  })
  return buckets.map((b) =>
    b.length ? Math.round(b.reduce((a, v) => a + v, 0) / b.length) : null
  )
}

/** 最近 days 天每日新增简历数（累计形态，用于走势） */
export function cumulativeResumes(days = 7) {
  const today = dayStart(Date.now())
  const start = today - (days - 1) * DAY
  const out = Array(days).fill(0)
  resumeList().forEach((it) => {
    const t = resumeTime(it)
    if (t == null) return
    const idx = Math.round((t - start) / DAY)
    if (idx >= 0 && idx < days) out[idx] += 1
  })
  let acc = 0
  return out.map((v) => (acc += v))
}

/** 最近 days 天内有面试记录的活跃天数（同一天多场只计一次） */
export function activeDays(days = 30) {
  const today = dayStart(Date.now())
  const start = today - (days - 1) * DAY
  const set = new Set()
  sessionList().forEach((r) => {
    if (r.date >= start && r.date <= today) set.add(r.date)
  })
  return set.size
}

/** 累计数组 */
export function cumulative(values) {
  let acc = 0
  return values.map((v) => (acc += v))
}

/** null 用前一个有效值补齐，便于画走势 */
export function fillMissing(values) {
  let last = 0
  return values.map((v) => (v == null ? last : (last = v)))
}

/** 数组求和 */
export function sum(values) {
  return values.reduce((a, b) => a + b, 0)
}

/** 平均分档位 */
export function scoreBand(v) {
  if (v == null) return 'none'
  if (v >= 80) return 'high'
  if (v >= 60) return 'mid'
  return 'low'
}

export function fmtDate(input, withTime = false) {
  if (input == null) return '—'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  const p = (n) => String(n).padStart(2, '0')
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return withTime ? `${day} ${p(d.getHours())}:${p(d.getMinutes())}` : day
}

export function fmtRelative(input) {
  const t = new Date(input).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = Date.now() - t
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.round(diff / 60000)} 分钟前`
  if (diff < DAY) return `${Math.round(diff / 3600000)} 小时前`
  if (diff < 7 * DAY) return `${Math.round(diff / DAY)} 天前`
  return fmtDate(input)
}
