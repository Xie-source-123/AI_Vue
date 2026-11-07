<template>
  <div class="card chat-panel">
    <div class="head">
      <h4 v-if="title">{{ title }}</h4>
      <div class="head-right">
        <span class="round-chip" :class="{ full: finished }">
          {{ rounds }} / {{ MAX_ROUNDS }} 轮
        </span>
        <span class="meta" v-if="position">{{ position }}</span>
        <!-- 音色切换：列表来自后端 GET /api/tts/voices -->
        <span class="pick-label">音色</span>
        <el-select
          v-model="voice"
          size="small"
          class="voice-pick"
          :disabled="!voices.length"
          :placeholder="voices.length ? '选择音色' : '音色不可用'"
        >
          <el-option v-for="v in voices" :key="v.id" :label="v.name" :value="v.id">
            <span class="opt-name">{{ v.name }}</span>
            <span class="opt-note">{{ v.note }}</span>
          </el-option>
        </el-select>
      </div>
    </div>

    <div ref="listEl" class="list">
      <div v-if="!messages.length" class="hint">
        选择上方岗位后，面试官会针对你的背景开始提问。
      </div>
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="msg"
        :class="m.role === 'user' ? 'user' : 'ai'"
      >
        <span class="bubble">{{ m.content }}</span>
        <span v-if="m.score != null" class="score" :class="scoreBand(m.score)">
          {{ m.score }} 分
        </span>
        <!-- 每条提问旁的小喇叭：可以单独回听任意一题 -->
        <button
          v-if="m.role === 'ai' && m.content"
          class="speak-mini press-sm focus-ring"
          :class="{ on: speakingKey === i }"
          :disabled="ttsLoading && speakingKey !== i"
          :aria-label="`朗读第 ${i + 1} 条内容`"
          @click="speak(m.content, i)"
        >
          <SpeakerIcon :size="14" />
        </button>
      </div>
      <div v-if="typing" class="msg ai">
        <span class="bubble typing"><i /><i /><i /></span>
        <span class="typing-label">面试官正在思考</span>
      </div>
    </div>

    <!-- 满轮后结束面试：输入区整块换为提示条，保留手动提交 -->
    <div v-if="finished" class="finished-note">
      已完成 {{ MAX_ROUNDS }} 轮问答，面试结束 —— 请点击下方按钮提交
    </div>
    <div v-else class="input-row">
      <input
        v-model="draft"
        :placeholder="recording ? '正在聆听…说完点麦克风结束' : '输入你的回答…'"
        :disabled="sending || !position || recording"
        @keyup.enter="send"
        @input="onDraftInput"
      />
      <!-- 语音输入：点一下开始、再点一下结束，转成文字填进输入框 -->
      <button
        class="mic press-sm focus-ring"
        :class="{ on: recording }"
        :data-tip="micTip"
        :disabled="!position || sending || asrBusy"
        :aria-label="recording ? '结束语音输入' : '开始语音输入'"
        :aria-pressed="recording"
        @click="toggleMic"
      >
        <MicIcon :size="17" />
      </button>
      <button
        class="speak press-sm focus-ring"
        :class="{ on: speakingKey === 'latest' }"
        :data-tip="speakTip"
        :disabled="ttsLoading || !latestAiText"
        aria-label="朗读最新一条提问"
        @click="speak(latestAiText, 'latest')"
      >
        <SpeakerIcon :size="17" />
      </button>
      <button
        class="send press-sm focus-ring"
        :disabled="sending || !draft.trim() || !position || recording"
        @click="send"
      >
        {{ sending ? '发送中' : '发送' }}
      </button>
    </div>

    <!-- 语音状态条：录音时逐字显示识别结果，结束后短暂提示处理结果 -->
    <div v-if="recording || asrNote" class="asr-strip" :class="{ live: recording }">
      <span class="asr-dot" aria-hidden="true" />
      <span class="asr-text">{{ asrText || asrNote }}</span>
    </div>
    <!-- 提交面试：写入 interview_records，供「历史记录」查询与生成评分报告 -->
    <div class="foot-row">
      <button
        class="submit-interview press-md focus-ring"
        :data-tip="submitTip"
        :disabled="!canSubmit"
        @click="submitInterview"
      >
        {{ submitting ? '保存中…' : '提交面试并保存' }}
      </button>
      <span v-if="isSubmitted" class="submitted-badge">已提交</span>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { h, ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { getUserItem, setUserItem } from '@/utils/userStorage.js'
import { scoreBand } from '@/utils/metrics.js'
import { submitted, summarizeMessages } from '@/utils/interviewSession.js'
import { ElMessage, ElMessageBox } from 'element-plus'
/* 提交面试时把记录同步一份到服务端 —— 管理后台的「数据总览」就靠它取数。
   面试记录原本只存在浏览器 localStorage 里，服务端一条都没有。 */
import { reportInterviewRecordAPI } from '@/api/admin.js'
/* worklet 源码取成字符串：AudioWorklet 要求加载的必须是原样的 JS，
   走 ?raw + Blob 就不必赌打包器会不会把它当模块处理过。 */
import workletSource from '@/utils/pcmCapture.worklet.js?raw'

const props = defineProps({
  title: { type: String, default: '' },
  position: { type: String, default: '' }
})

const listEl = ref(null)
const draft = ref('')
const sending = ref(false)
const typing = ref(false)
const error = ref('')
const messages = ref([])

const ENDPOINT = 'http://localhost:8000/api/chat/stream'

/* ===== 提交面试 ===== */
const submitting = ref(false)

/* 提交那一刻的消息条数快照：
   条数相同即视为「已提交」，按钮禁用，避免对同一状态重复提交；
   之后继续对话会让条数变化，按钮自动重新可用（相当于存一份新快照）。 */
const submittedSnapshot = ref(0)
const isSubmitted = computed(
  () => submittedSnapshot.value > 0 && submittedSnapshot.value === messages.value.length
)
const canSubmit = computed(
  () => messages.value.length > 0 && !sending.value && !submitting.value && !isSubmitted.value
)

/* ===== 面试轮次 =====
   按「面试官回复条数」计（无论是否带评分），满 MAX_ROUNDS 轮结束。
   finished 额外要求 !sending —— 否则第 5 轮回答还在流式输出时输入框就消失了。 */
const MAX_ROUNDS = 5
const rounds = computed(
  () => messages.value.filter((m) => m.role === 'ai' && m.content).length
)
const finished = computed(() => rounds.value >= MAX_ROUNDS && !sending.value)

/* 按钮的悬停气泡文案：随状态变化，比原来那条固定灰字更有用 */
const submitTip = computed(() =>
  isSubmitted.value
    ? '已保存到历史记录，继续追问后可再次提交'
    : '提交到历史记录，之后可查看问答与评分，并生成评分报告'
)

function readRecords() {
  try {
    const v = JSON.parse(getUserItem('interview_records') || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

async function submitInterview() {
  const list = messages.value
  if (!list.length) {
    ElMessage.warning('还没有面试对话，无法提交')
    return
  }

  const summary = summarizeMessages(list)
  try {
    await ElMessageBox.confirm(
      `将保存本次面试：${props.position}，共 ${summary.rounds} 轮问答` +
        (summary.avg == null ? '（暂无评分）' : `，平均 ${summary.avg} 分`),
      '提交面试',
      { confirmButtonText: '提交并保存', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  submitting.value = true
  try {
    const record = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      position: props.position,
      name: `面试记录_${new Date().toLocaleString('zh-CN')}`,
      messages: JSON.parse(JSON.stringify(list))
    }

    const existing = readRecords()
    existing.unshift(record)
    setUserItem('interview_records', JSON.stringify(existing))

    /* 同步一份到服务端。
       单独包一层 try：上报失败【不该】让整个提交失败 ——
       对用户本人来说面试记录已经存在本地了，功能是完整的；
       而管理后台那边只是少一条统计数据。 */
    try {
      const who = localStorage.getItem('username') || 'local_user_001'
      await reportInterviewRecordAPI(who, record)
    } catch {
      /* 静默：不打扰用户，也不回滚本地数据 */
    }

    submittedSnapshot.value = list.length
    /* 右侧评分卡据此展示「生成评分报告」 */
    submitted.value = {
      id: record.id,
      position: record.position,
      name: record.name,
      date: record.date,
      rounds: summary.rounds,
      avg: summary.avg,
      qa: summary.qa
    }

    ElMessage.success('面试已提交，可在右侧生成评分报告')
  } catch (e) {
    ElMessage.error('提交失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

const scrollBottom = () =>
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })

watch(
  () => props.position,
  (v) => {
    if (v) setUserItem('selectedPosition', v)
  }
)

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value || !props.position || finished.value) return

  /* 开始新一轮问答时停掉正在朗读的旧提问，否则会和新回复的流式输出叠在一起 */
  stopSpeak()

  /* 这条是语音转来的吗？是的话把面试官回复也读出来 ——
     语音进、语音出才算完整的一轮对话；手打的保持安静，不打扰正在打字的人。 */
  const speakReply = voiceDraft.value
  voiceDraft.value = false

  error.value = ''
  messages.value.push({ role: 'user', content: text })
  draft.value = ''
  sending.value = true
  typing.value = true
  scrollBottom()

  try {
    const userId = localStorage.getItem('username') || 'local_user_001'
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ message: text, position: props.position, user_id: userId })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let content = ''
    let score = null
    let index = -1

    /* 缺陷修复：不要在这里就关掉打字指示器。
       响应头到达与首个数据块之间有一段空档，提前关掉会出现
       「指示器已消失、气泡还没建」的空白断层，看起来就像闪退。
       改为等首段正文真正到达时再关（见下面的循环内）。 */
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        if (!raw || raw === '[DONE]') continue
        try {
          const chunk = JSON.parse(raw)
          /* 后端会把 Dify 的失败以 type:'error' 转发过来（工作流失败、鉴权失败、
             模型余额不足等）。旧代码只挑 content / score，这类事件被静默丢弃，
             界面上只剩一句「面试官没有返回内容」，看不出真正原因。 */
          if (chunk.type === 'error') {
            error.value = `面试服务出错：${chunk.message || '未知错误'}`
            continue
          }
          content += chunk.content || chunk.reply || chunk.delta?.content || ''
          const s = chunk.score ?? chunk.rating ?? chunk.delta?.score ?? chunk.metadata?.score
          if (s != null && !Number.isNaN(Number(s))) score = Number(s)
          /* 缺陷修复：只在拿到正文时才建气泡。
             很多 SSE 实现的首包只带 score / 元信息、不带 content，
             那种情况下建出来的是空气泡 —— 空气泡同样会播放入场动画，
             视觉上就是「先闪出一个空泡，再被正文填上」。 */
          if (index === -1) {
            if (!content) continue
            typing.value = false
            messages.value.push({ role: 'ai', content, score })
            index = messages.value.length - 1
          } else {
            messages.value[index] = { role: 'ai', content, score }
          }
          scrollBottom()
        } catch {
          /* 忽略无法解析的行 */
        }
      }
    }

    /* 整段流结束仍没建过气泡：后端没返回正文（或只回了元信息） */
    if (index === -1) {
      messages.value.push({
        role: 'ai',
        content: content || '（面试官没有返回内容）',
        score
      })
    }

    /* 语音提问 → 自动朗读回复。失败时不读，免得把错误提示念一遍。 */
    if (speakReply && content && index !== -1) {
      speak(messages.value[index].content, index)
    }
  } catch (e) {
    error.value = `连接面试服务失败：${e.message}（请确认本地 8000 端口服务已启动）`
  } finally {
    sending.value = false
    typing.value = false
    scrollBottom()
  }
}

/* ===== 文本转语音（TTS）=====
   密钥在后端 .env 里，前端只调 /api/tts 换回 mp3 字节 —— 前端拿不到也不需要密钥。
   全程只保留一个 Audio 实例：换一条朗读会先停掉上一条，不会叠着响。 */
const TTS_ENDPOINT = 'http://localhost:8000/api/tts'
const ttsLoading = ref(false)
/* 正在朗读的标识：'latest' 指输入区那个按钮，数字指对应索引的气泡 */
const speakingKey = ref(null)
let audioEl = null
let audioUrl = ''

/* 最新一条面试官提问 —— 输入区那个按钮读它 */
const latestAiText = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i]
    if (m.role === 'ai' && m.content) return m.content
  }
  return ''
})

const speakTip = computed(() =>
  latestAiText.value ? '朗读最新一条提问' : '还没有提问可朗读'
)

function stopSpeak() {
  if (audioEl) {
    audioEl.pause()
    audioEl = null
  }
  /* 必须回收：否则每朗读一次就泄漏一份音频内存 */
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl)
    audioUrl = ''
  }
  speakingKey.value = null
}

async function speak(text, key) {
  const body = String(text || '').trim()
  if (!body) return

  /* 再点同一条 = 停止播放 */
  if (speakingKey.value === key) {
    stopSpeak()
    return
  }

  stopSpeak()
  ttsLoading.value = true
  try {
    const res = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body, voice: voice.value || '' })
    })
    if (!res.ok) {
      /* 后端的 HTTPException 会把原因放在 detail 里，透出来便于定位
         —— 比如密钥没填、域名填错、音色 ID 不存在 */
      let detail = `HTTP ${res.status}`
      try {
        detail = (await res.json()).detail || detail
      } catch {
        /* 响应不是 JSON（比如网关透传的纯文本），保留状态码 */
      }
      throw new Error(detail)
    }

    const blob = await res.blob()
    audioUrl = URL.createObjectURL(blob)
    audioEl = new Audio(audioUrl)
    speakingKey.value = key
    audioEl.addEventListener('ended', stopSpeak)
    audioEl.addEventListener('error', stopSpeak)
    await audioEl.play()
  } catch (e) {
    stopSpeak()
    ElMessage.error('语音合成失败：' + e.message)
  } finally {
    ttsLoading.value = false
  }
}

/* 喇叭图标：Element Plus 没有"朗读/音量"这个语义的图标（只有 Mute / Microphone），
   所以自带一个内联 SVG，用 currentColor 继承按钮文字色。
   做成函数式组件是为了输入区和气泡两处共用，避免同一段 SVG 写两遍；
   动画则挂在按钮的 .on 上、用 :deep() 穿透过去 —— 函数式组件生成的节点
   拿不到 scoped 的 data 属性，直接写 .tts-wave 选择器是选不中的。 */
const SpeakerIcon = (props) =>
  h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: props.size,
      height: props.size,
      'aria-hidden': 'true',
      focusable: 'false'
    },
    [
      h('path', { d: 'M4 9.5v5h3.3L12 18.7V5.3L7.3 9.5H4z', fill: 'currentColor' }),
      h('path', {
        class: 'tts-wave',
        d: 'M15.1 8.7a4.5 4.5 0 0 1 0 6.6',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 1.7,
        'stroke-linecap': 'round'
      }),
      h('path', {
        class: 'tts-wave',
        d: 'M17.7 6a8 8 0 0 1 0 12',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 1.7,
        'stroke-linecap': 'round'
      })
    ]
  )
SpeakerIcon.props = { size: { type: [Number, String], default: 16 } }

/* 麦克风图标：同样内联 SVG —— Element Plus 的 Microphone 是"输入设备"语义，
   不是一个可点的录音按钮，线条粗细也和喇叭对不上。用 currentColor 继承文字色。 */
const MicIcon = (props) =>
  h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: props.size,
      height: props.size,
      'aria-hidden': 'true',
      focusable: 'false'
    },
    [
      h('path', {
        d: 'M12 3.6a2.6 2.6 0 0 1 2.6 2.6v5.3a2.6 2.6 0 0 1-5.2 0V6.2A2.6 2.6 0 0 1 12 3.6z',
        fill: 'currentColor'
      }),
      h('path', {
        d: 'M6.5 10.3a.9.9 0 0 1 .9.9 4.6 4.6 0 0 0 9.2 0 .9.9 0 1 1 1.8 0 6.4 6.4 0 0 1-5.5 6.3v1.4h2.2a.9.9 0 0 1 0 1.8H8.9a.9.9 0 0 1 0-1.8h2.2v-1.4a6.4 6.4 0 0 1-5.5-6.3.9.9 0 0 1 .9-.9z',
        fill: 'currentColor'
      })
    ]
  )
MicIcon.props = { size: { type: [Number, String], default: 16 } }

/* ===== 语音输入（ASR）=====
   链路：麦克风 → AudioWorklet（16kHz 单声道 PCM）→ 本后端 /api/asr → 阿里云百炼。
   密钥、上下文增强、即时热词都在后端拼装，前端只负责采集与展示。

   两个来自官方文档、直接决定实现方式的硬约束：
     1. ASR 只收单声道 PCM。文档写明「opus 必须 Ogg 封装、wav 必须是 PCM 编码」，
        所以 MediaRecorder 默认吐的 webm/opus 是【不能】用的，
        只能在 AudioWorklet 里取原始采样、自己转成 PCM；
     2. 必须等 task-started（后端转成 ready）之后才能推音频，早推会被直接丢弃。
        而用户在 ready 到达之前就已经开口了，所以这里要先把音频排队存住、
        等 ready 再补发 —— 否则每一句的开头一两个字必然丢掉。 */
const ASR_ENDPOINT = 'ws://localhost:8000/api/asr'
const ASR_RATE = 16000
const ASR_QUEUE_LIMIT = ASR_RATE * 2 * 3 // 3 秒：连接一直建不起来时不能无限吃内存

/* 语音会话的阶段。用状态机而不是几个布尔量：
   录音中按钮必须保持可点（再点一下才停得下来），只有「连接中 / 收尾识别中」才禁用。
   几个布尔量混着用，最容易写出「录音时按钮被自己禁掉、停不下来」这种死结。 */
const asrPhase = ref('') // '' | 'connecting' | 'recording' | 'finishing'
const recording = computed(() => asrPhase.value === 'recording')
const asrBusy = computed(() => asrPhase.value === 'connecting' || asrPhase.value === 'finishing')
const asrText = ref('') // 实时转写，会随中间结果不断改写
const asrNote = ref('') // 状态提示条
const voiceDraft = ref(false) // 草稿是否来自语音 → 决定面试官回复要不要自动朗读

let audioCtx = null
let micStream = null
let workletNode = null
let asrWs = null
let asrReady = false
let asrQueue = []
let asrQueueBytes = 0
let asrFinals = {} // sentenceId → 该句最终文本
let asrPartialId = null
let asrPartialText = ''
let asrTimerStop = 0
let asrTimerGuard = 0
/* 一次会话只能收尾一次。done、error、断线、守卫超时都可能先到，
   重复收尾会把已经填好的文本清掉、再盖一句「没有听清」上去。 */
let asrFinished = true

let workletUrl = ''
function ensureWorkletUrl() {
  if (!workletUrl) {
    workletUrl = URL.createObjectURL(
      new Blob([workletSource], { type: 'application/javascript' })
    )
  }
  return workletUrl
}

/* 上下文增强：把最近几轮问答交给 ASR，岗位名与技术栈的识别会明显更准。
   官方限制 input_text / text 各 5 条、总长 400 字符，后端还会再截一次。 */
function buildAsrHistory() {
  return messages.value
    .filter((m) => m.content)
    .slice(-10)
    .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', text: m.content }))
}

/* 中间结果会反复改写同一句，最终结果才落定；
   所以展示文本 = 各已定稿句子按序号拼接 + 当前这句的中间结果。 */
function recomputeAsrText() {
  const ids = Object.keys(asrFinals)
    .map(Number)
    .sort((a, b) => a - b)
  let text = ids.map((k) => asrFinals[k]).join('')
  if (asrPartialText && !(asrPartialId in asrFinals)) text += asrPartialText
  asrText.value = text
}

function clearAsrTimers() {
  if (asrTimerStop) window.clearTimeout(asrTimerStop)
  if (asrTimerGuard) window.clearTimeout(asrTimerGuard)
  asrTimerStop = 0
  asrTimerGuard = 0
}

async function openMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('当前环境拿不到麦克风，请用 localhost 或 https 打开')
  }

  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true, // 开着能压掉扬声器串回来的声音，避免"自己听自己"
      noiseSuppression: true,
      autoGainControl: true
    }
  })

  /* 直接向浏览器要 16k：它会把麦克风输入重采样好，worklet 里几乎不用再降采样。
     个别设备给不了这个采样率时会退回设备默认值，worklet 里的线性插值兜住。 */
  audioCtx = new AudioContext({ sampleRate: ASR_RATE })
  if (audioCtx.state === 'suspended') await audioCtx.resume()

  await audioCtx.audioWorklet.addModule(ensureWorkletUrl())
  const source = audioCtx.createMediaStreamSource(micStream)
  workletNode = new AudioWorkletNode(audioCtx, 'pcm-capture')

  workletNode.port.onmessage = (ev) => {
    const buf = ev.data
    if (!buf || !buf.byteLength) return
    if (asrReady && asrWs && asrWs.readyState === WebSocket.OPEN) {
      asrWs.send(buf)
      return
    }
    if (asrQueueBytes >= ASR_QUEUE_LIMIT) return
    asrQueue.push(buf)
    asrQueueBytes += buf.byteLength
  }

  source.connect(workletNode)
  /* 必须连到 destination：部分浏览器里没有出口节点的 worklet 不会被驱动。
     worklet 不往输出写数据，所以这里过的是静音，不会形成回授啸叫。 */
  workletNode.connect(audioCtx.destination)
}

function closeMic() {
  try {
    workletNode?.disconnect()
  } catch {
    /* 已经断开 */
  }
  workletNode = null

  if (audioCtx) {
    /* close() 是异步的，这里不 await：清Mic 要立刻生效，
       音频上下文稍后自己收尾，不影响已经取到的 PCM */
    audioCtx.close().catch(() => {})
    audioCtx = null
  }

  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop())
    micStream = null
  }
}

function flushAsrQueue() {
  if (!asrWs || asrWs.readyState !== WebSocket.OPEN) return
  for (const buf of asrQueue) asrWs.send(buf)
  asrQueue = []
  asrQueueBytes = 0
}

function closeAsrSocket() {
  asrReady = false
  if (asrWs) {
    try {
      asrWs.close()
    } catch {
      /* 已经关了 */
    }
    asrWs = null
  }
}

function openAsrSocket() {
  return new Promise((resolve, reject) => {
    let settled = false
    const ws = new WebSocket(ASR_ENDPOINT)
    asrWs = ws

    const fail = (msg) => {
      if (settled) return
      settled = true
      reject(new Error(msg))
    }

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'start',
          position: props.position,
          history: buildAsrHistory()
        })
      )
    }

    ws.onmessage = (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }

      if (msg.type === 'ready') {
        asrReady = true
        flushAsrQueue() // 把等待期间攒下的开头补发出去
        if (!settled) {
          settled = true
          resolve()
        }
        return
      }
      if (msg.type === 'partial') {
        asrPartialId = msg.sentenceId
        asrPartialText = msg.text || ''
        recomputeAsrText()
        return
      }
      if (msg.type === 'sentence') {
        asrFinals[msg.sentenceId] = msg.text || ''
        if (asrPartialId === msg.sentenceId) asrPartialText = ''
        recomputeAsrText()
        return
      }
      if (msg.type === 'error') {
        /* 后端的失败原因原样透出来：余额不足、鉴权失败、时长超限都在这 */
        error.value = `语音识别出错：${msg.message || '未知错误'}`
        finishRecord()
        return
      }
      if (msg.type === 'done') {
        finishRecord()
      }
    }

    ws.onerror = () => fail('语音服务连不上（请确认本地 8000 端口服务已启动）')
    ws.onclose = () => {
      if (asrWs === ws) asrWs = null
      if (!settled) {
        fail('语音服务连接被关闭')
        return
      }
      /* 服务端收尾后主动断开是正常路径；
         中途掉线也要立刻收尾，别让用户对着「正在识别」干等守卫超时。 */
      if (asrPhase.value === 'recording' || asrPhase.value === 'finishing') finishRecord()
    }
  })
}

/* 收尾（幂等）：把已经拿到的文本填进输入框，然后收拾干净。
   unfinished 的原因可能是 done、error、断线或守卫超时，都汇到这里。 */
function finishRecord() {
  if (asrFinished) return
  asrFinished = true
  clearAsrTimers()
  asrPhase.value = ''
  closeAsrSocket()
  closeMic()

  const text = asrText.value.trim()
  asrText.value = ''
  asrFinals = {}
  asrPartialId = null
  asrPartialText = ''
  asrQueue = []
  asrQueueBytes = 0

  if (text) {
    /* 填进输入框而不是直接发出去：识别难免有错字，先让人看一眼，
       免得错字被当成真实回答写进聊天记录和评分。 */
    draft.value = draft.value.trim() ? `${draft.value.trim()} ${text}` : text
    voiceDraft.value = true
    asrNote.value = '已转成文字，确认后点「发送」'
  } else {
    asrNote.value = '没有听清，再试一次'
  }

  window.setTimeout(() => {
    if (!recording.value && !asrBusy.value) asrNote.value = ''
  }, 4000)
}

async function startRecord() {
  if (recording.value || asrBusy.value || sending.value) return
  if (!props.position) {
    ElMessage.warning('请先在上方选择面试岗位')
    return
  }

  error.value = ''
  asrNote.value = '正在打开麦克风…'
  asrPhase.value = 'connecting'
  asrFinished = false
  asrReady = false
  asrQueue = []
  asrQueueBytes = 0
  asrFinals = {}
  asrPartialId = null
  asrPartialText = ''
  asrText.value = ''

  try {
    await openAsrSocket()
    await openMic()
  } catch (e) {
    finishRecord()
    /* 连接/授权阶段就失败时说「没有听清」是误导 —— 真正原因在弹窗里 */
    asrNote.value = ''
    ElMessage.error(e.message || '无法开始录音')
    return
  }

  asrPhase.value = 'recording'
  asrNote.value = '正在聆听，说完再点一下结束'
}

function stopRecord() {
  if (!recording.value) return
  asrPhase.value = 'finishing'
  asrNote.value = '正在识别…'

  /* 顺序很关键：先让 worklet 把不满 100ms 的尾巴冲出来，再发 stop。
     反过来的话最后半个字会留在 worklet 里，转写结果缺一截。 */
  try {
    workletNode?.port.postMessage('flush')
  } catch {
    /* worklet 已经回收 */
  }

  asrTimerStop = window.setTimeout(() => {
    try {
      if (asrWs && asrWs.readyState === WebSocket.OPEN) {
        asrWs.send(JSON.stringify({ type: 'stop' }))
      }
    } catch {
      /* 连接已断，交给 onclose 收尾 */
    }
    closeMic()
  }, 200)

  /* 守卫：服务端迟迟不返回 done 时不能一直卡在「正在识别」 */
  asrTimerGuard = window.setTimeout(() => {
    if (asrPhase.value === 'finishing') finishRecord()
  }, 15000)
}

function toggleMic() {
  if (recording.value) stopRecord()
  else startRecord()
}

const micTip = computed(() => {
  if (!props.position) return '请先在上方选择面试岗位'
  if (asrPhase.value === 'recording') return '再点一下结束，转成文字'
  if (asrPhase.value === 'connecting') return '正在连接语音服务…'
  if (asrPhase.value === 'finishing') return '正在识别，请稍候…'
  return '点一下开始说话，再点一下结束'
})

/* 用户一旦动了输入框，这条草稿就不再算「语音来的」，
   发送后也就不会自动朗读回复 —— 既然他自己改过，就按打字处理。 */
function onDraftInput() {
  voiceDraft.value = false
}

/* ===== 音色切换 =====
   列表来自后端 GET /api/tts/voices —— 不在前端重复维护一份。
   理由是文档明确「音色不能跨模型混用，填错返回 InvalidParameter」，
   一旦换了模型，前端那份抄来的列表就会静默失效。
   拿不到列表也不影响朗读：后端会用 .env 里的默认音色。 */
const TTS_VOICES_ENDPOINT = 'http://localhost:8000/api/tts/voices'
const voices = ref([])
const voice = ref(getUserItem('tts_voice') || '')

async function loadVoices() {
  try {
    const res = await fetch(TTS_VOICES_ENDPOINT)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    voices.value = data.voices || []
    /* 本地记下的音色若已不在后端列表里（比如换了模型），回落到后端默认值 */
    if (!voices.value.some((v) => v.id === voice.value)) voice.value = data.default || ''
  } catch {
    voices.value = []
  }
}

watch(voice, (v) => {
  if (v) setUserItem('tts_voice', v)
})

onMounted(loadVoices)

/* 组件卸载时必须停播并回收 Blob，否则切走页面后音频还在响 */
onUnmounted(() => {
  stopSpeak()
  /* 录音相关也要一起收：麦克风轨道不停会一直占着系统的录音指示灯 */
  clearAsrTimers()
  asrPhase.value = ''
  closeAsrSocket()
  closeMic()
})

/* 恢复上次选中的岗位 */
const saved = getUserItem('selectedPosition')

defineExpose({ reset: () => (messages.value = []) })
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ===== 音色切换 ===== */
.pick-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  color: var(--body-muted);
  flex-shrink: 0;
}
.voice-pick {
  width: 138px;
  flex-shrink: 0;
}
/* 胶囊化 + 主题描边，与轮次徽标同一视觉语言 */
.voice-pick :deep(.el-select__wrapper) {
  border-radius: var(--rad-pill);
  background: var(--canvas-2);
  box-shadow: 0 0 0 1px var(--accent-line) inset;
  transition: var(--slide-trans);
}
.voice-pick :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--accent) inset;
}
/* 下拉项做成两行：名称 + 特质，试听前就知道是什么音色。
   这两条选择器能被匹配到，是因为 el-option 的插槽内容仍属于本组件，
   会带上 scoped 的 data-v 属性（即便 DOM 被 teleport 到 body 下）。 */
.opt-name {
  margin-right: 8px;
  color: var(--ink);
}
.opt-note {
  font-size: 11px;
  color: var(--body-muted);
}

/* 轮次徽标：未满用草木青，满轮转危色以示结束 */
.round-chip {
  padding: 3px 10px;
  border-radius: var(--rad-pill);
  background: var(--accent-wash);
  border: 1px solid var(--accent-line);
  color: var(--accent-hover);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.round-chip.full {
  background: var(--danger-wash);
  border-color: var(--danger-line);
  color: var(--danger);
}

.finished-note {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid var(--accent-line);
  border-radius: var(--rad-block);
  background: var(--accent-wash);
  box-shadow: inset 0 1px 0 var(--inset-sheen);
  color: var(--accent-hover);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  text-align: center;
}

.meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  text-transform: uppercase;
  color: var(--accent);
}
.list {
  margin-top: 14px;
  height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}
.hint {
  font-size: 12px;
  color: var(--body-muted);
}
.msg {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.msg.user {
  justify-content: flex-end;
}
.bubble {
  max-width: 84%;
  padding: 10px 14px;
  border-radius: var(--rad-block);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.ai .bubble {
  background: var(--canvas-2);
  border: 1px solid var(--hairline);
  border-bottom-left-radius: var(--rad-sm);
  color: var(--ink);
  /* 错向入场：AI 从左侧滑入、用户从右侧滑入。
     backwards 让动画结束后交还给普通样式，不影响后续 hover / 布局。 */
  animation: msg-in-left var(--dur-slow) var(--ease-out) backwards;
}
.msg.user .bubble {
  background: var(--accent);
  border: 1px solid var(--accent);
  border-bottom-right-radius: var(--rad-sm);
  color: var(--accent-ink);
  animation: msg-in-right var(--dur-slow) var(--ease-out) backwards;
}
@keyframes msg-in-left {
  from {
    opacity: 0;
    transform: translate(-10px, 6px);
  }
  to {
    opacity: 1;
    transform: translate(0, 0);
  }
}
@keyframes msg-in-right {
  from {
    opacity: 0;
    transform: translate(10px, 6px);
  }
  to {
    opacity: 1;
    transform: translate(0, 0);
  }
}

/* 评分徽标：按分档着色，数据表达比原来的一行小灰字清楚得多 */
.score {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--rad-pill);
  border: 1px solid transparent;
  flex-shrink: 0;
}
.score.high {
  background: var(--accent-wash);
  border-color: var(--accent-line);
  color: var(--accent-hover);
}
.score.mid {
  background: var(--warn-wash);
  border-color: var(--warn);
  color: var(--warn);
}
.score.low {
  background: var(--danger-wash);
  border-color: var(--danger-line);
  color: var(--danger);
}
.score.none {
  background: var(--muted-wash);
  color: var(--body-muted);
}
.typing-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--track-eyebrow);
  color: var(--body-muted);
  flex-shrink: 0;
}
.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.typing i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--body-muted);
  animation: blink 1.2s infinite ease-in-out;
}
.typing i:nth-child(2) {
  animation-delay: 0.2s;
}
.typing i:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}
.input-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.input-row input {
  flex: 1;
  padding: 10px 14px;
  font-size: 13px;
  border-radius: var(--rad-block);
  /* 原生 input 的浏览器默认边框偏黑，改用主题浅绿 */
  border: 1px solid var(--accent-line);
  background: var(--canvas-2);
  color: var(--ink);
  transition: var(--slide-trans);
}
.input-row input::placeholder {
  color: var(--body-muted);
}
.input-row input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--surface);
}
.input-row input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== 朗读按钮 =====
   输入区那个与输入框同高：.input-row 没有设 align-items，默认 stretch，
   所以只给宽度、不给高度，它就会被自动拉满行高。
   气泡旁那个是 24px 的小圆钮，跟在评分徽标之后。 */
.speak {
  flex-shrink: 0;
  width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent-line);
  background: var(--accent-wash);
  color: var(--accent-hover);
  cursor: pointer;
  transition: var(--slide-trans);
}
.speak:hover:not(:disabled) {
  background: var(--accent-wash-2);
  border-color: var(--accent);
}
.speak:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ===== 语音输入按钮 =====
   与朗读按钮同宽，靠 .input-row 的默认 stretch 拉满行高。
   录音时整颗点亮：这是「麦克风正开着」最要紧的提示 ——
   只靠一个一闪一闪的小圆点，用户在别处打字时根本注意不到。 */
.mic {
  flex-shrink: 0;
  width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent-line);
  background: var(--accent-wash);
  color: var(--accent-hover);
  cursor: pointer;
  transition: var(--slide-trans);
}
.mic:hover:not(:disabled) {
  background: var(--accent-wash-2);
  border-color: var(--accent);
}
.mic:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mic.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
  animation: mic-breathe 1.6s ease-in-out infinite;
}
@keyframes mic-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--accent-wash-2);
  }
  50% {
    box-shadow: 0 0 0 5px var(--accent-wash-2);
  }
}

/* ===== 语音状态条 =====
   录音时逐字显示识别结果，结束/出错后短暂提示。
   高度固定：它一出现一消失就把上面的输入框顶得上下跳，很晃眼。 */
.asr-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  margin-top: 8px;
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1.5;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent-line);
  background: var(--accent-wash);
  color: var(--body);
}
.asr-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: var(--rad-pill);
  background: var(--accent);
}
.asr-strip.live .asr-dot {
  animation: asr-blink 1s ease-in-out infinite;
}
.asr-text {
  /* 转写会越写越长，两行封顶，别把输入区一路顶上去 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
@keyframes asr-blink {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

/* 这套动效只是「正在工作」的旁白，不是信息本身 ——
   用户在系统里关掉动效时就应该安静下来 */
@media (prefers-reduced-motion: reduce) {
  .mic.on,
  .asr-strip.live .asr-dot {
    animation: none;
  }
}

.speak-mini {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rad-pill);
  border: 1px solid var(--accent-line);
  background: transparent;
  color: var(--body-muted);
  cursor: pointer;
  transition: var(--slide-trans);
}
.speak-mini:hover:not(:disabled) {
  background: var(--accent-wash);
  border-color: var(--accent);
  color: var(--accent-hover);
}
.speak-mini:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* 播放中的实心强调色态 */
.speak.on,
.speak-mini.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

/* 声波弧线：静止时淡，播放时逐条脉动。
   必须用 :deep() 穿透 —— SpeakerIcon 是函数式组件生成的节点，
   拿不到 scoped 的 data-v 属性，直接写 .tts-wave 是选不中的。 */
.speak :deep(.tts-wave),
.speak-mini :deep(.tts-wave) {
  opacity: 0.6;
}
.speak.on :deep(.tts-wave),
.speak-mini.on :deep(.tts-wave) {
  opacity: 1;
  animation: tts-pulse 0.9s ease-in-out infinite;
}
.speak.on :deep(.tts-wave:last-of-type),
.speak-mini.on :deep(.tts-wave:last-of-type) {
  animation-delay: 0.16s;
}
@keyframes tts-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

.send {
  padding: 0 20px;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}
.send:hover:not(:disabled) {
  background: var(--accent-hover);
}
.send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.foot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
}

.submit-interview {
  flex-shrink: 0;
  padding: 10px 18px;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  border-radius: var(--rad-block);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--slide-trans);
}

.submit-interview:hover:not(:disabled) {
  background: var(--accent-hover);
}

.submit-interview:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submitted-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: var(--rad-pill);
  background: var(--accent-wash);
  border: 1px solid var(--accent-line);
  color: var(--accent-hover);
  font-size: 12px;
  font-weight: 600;
}



.error {
  margin-top: 8px;
  font-size: 12px;
  color: var(--danger);
}
</style>
