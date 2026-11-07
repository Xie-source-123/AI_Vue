/* ============================================================================
 * 麦克风 PCM 采集 AudioWorklet
 * ----------------------------------------------------------------------------
 * 为什么非要 AudioWorklet 不可：
 *   阿里云百炼的实时 ASR 只收【单声道 PCM/WAV/Opus/AAC/AMR】这一组格式，
 *   而且文档写死了「opus 必须 Ogg 封装、wav 必须是 PCM 编码」。
 *   浏览器 MediaRecorder 默认吐的是 webm/opus —— 既不是 Ogg 封装，
 *   也不是裸 PCM，直接推上去会被判为无效音频。
 *   所以只能在音频线程里自己取原始采样，用它算出的 PCM 才是能用的。
 *
 * 这个文件是给 audioWorklet.addModule() 加载的，运行在音频渲染线程：
 *   · 不能用 import / export，也不能碰 DOM；
 *   · 全局只有 sampleRate、currentTime、registerProcessor 等少数几个；
 *   · 每 128 帧被回调一次（48000Hz 下约 375 次/秒），
 *     所以不能每帧都 postMessage —— 攒够 100ms 再发一次，主线程才不会被淹掉。
 * ==========================================================================*/

const TARGET_RATE = 16000        // ASR 要的采样率
const CHUNK_BYTES = 3200         // 100ms @ 16kHz/16bit，攒够这个量再发一次

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()

    /* 目标 16k。多数设备是 48k（整数 3 倍分频），线性插值在这种比例下
       误差可以忽略；真遇到 44.1k 这类非整数比例，也就是多一点点混叠，
       识别完全够用。比自己写一套多相滤波器划算得多。 */
    this.ratio = sampleRate / TARGET_RATE

    /* 跨块相位：一帧 128 帧、降采样后往往不到 128 个点，
       余下的相位必须带到下一帧，否则每帧都会丢一点点，音高会漂。 */
    this.phase = 0

    this.pending = []            // 攒着的 Int16Array
    this.pendingBytes = 0

    /* 松开按钮时主线程会喊一声 flush：不满 100ms 的尾巴也得发出去，
       否则最后半个字会丢在 worklet 里，转写结果少一截。 */
    this.port.onmessage = (e) => {
      if (e.data === 'flush') this.flush()
    }
  }

  flush() {
    if (!this.pendingBytes) return
    const merged = new Int16Array(this.pendingBytes / 2)
    let offset = 0
    for (const part of this.pending) {
      merged.set(part, offset)
      offset += part.length
    }
    this.pending = []
    this.pendingBytes = 0
    /* 转移所有权而不是拷贝：这块内存直接交给主线程，音频线程不再碰它 */
    this.port.postMessage(merged.buffer, [merged.buffer])
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]

    /* 没有输入（麦克风还没就绪、或轨道被掐断）时返回 true 保住这个处理器，
       返回 false 会让 worklet 被回收，之后再也收不到音频。 */
    if (!channel || !channel.length) return true

    const out = new Float32Array(Math.ceil(channel.length / this.ratio) + 1)
    let count = 0
    let pos = this.phase

    while (pos < channel.length) {
      const i = Math.floor(pos)
      const frac = pos - i
      const a = channel[i]
      const b = i + 1 < channel.length ? channel[i + 1] : a
      out[count++] = a + (b - a) * frac
      pos += this.ratio
    }

    /* 带不走的相位留给下一帧。这里减掉 channel.length 而不是取模，
       是因为 pos 的整数部分对应的是本帧已经消费掉的采样点。 */
    this.phase = pos - channel.length

    const pcm = new Int16Array(count)
    for (let k = 0; k < count; k++) {
      const s = out[k] < -1 ? -1 : out[k] > 1 ? 1 : out[k]
      /* 负半轴是 0x8000、正半轴是 0x7FFF：不对称是 16 位有符号的固有边界，
         写成同一个数会在满幅时溢出成反相爆音 */
      pcm[k] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    this.pending.push(pcm)
    this.pendingBytes += pcm.length * 2
    if (this.pendingBytes >= CHUNK_BYTES) this.flush()

    return true
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor)
