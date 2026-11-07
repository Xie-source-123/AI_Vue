<template>
  <div class="a-page">
    <div class="a-card">
      <div class="a-card-head">
        <div>
          <div class="a-card-title">服务自检</div>
          <div class="a-card-sub">
            下面几项就是之前排查问题时手敲的那些探针，做成面板省得每次去翻日志
          </div>
        </div>
        <div class="a-toolbar">
          <el-button :icon="Refresh" :loading="loading" @click="load(false)">刷新</el-button>
          <el-button type="primary" :icon="Connection" :loading="probing" @click="load(true)">
            {{ probing ? '检测中…' : '重新检测' }}
          </el-button>
        </div>
      </div>

      <p class="s-note">
        <el-icon :size="13"><InfoFilled /></el-icon>
        「刷新」只读内存里的配置（毫秒级）；「重新检测」会真的发一次网络请求，
        用于确认密钥是否还有效、应用是否还在。检测打的是 Dify 的
        <code>/parameters</code> 接口 —— 它<b>不触发模型推理，因此不花钱</b>。
      </p>
    </div>

    <!-- ===== 对话服务 ===== -->
    <div class="a-card">
      <div class="a-card-head">
        <div class="a-card-title">
          <span class="a-dot" :class="difyDot" />&nbsp;对话服务（Dify）
        </div>
        <span v-if="status?.dify?.probe" class="s-verdict" :class="{ bad: !status.dify.probe.ok }">
          {{ status.dify.probe.ok ? '连接正常' : '异常' }}
        </span>
      </div>
      <dl class="a-kv">
        <dt>接口地址</dt>
        <dd>{{ status?.dify?.url || '未配置' }}</dd>
        <dt>API Key</dt>
        <dd>{{ status?.dify?.key || '未配置' }}</dd>
        <dt>工作流（评分报告）</dt>
        <dd>{{ status?.dify?.workflow_configured ? status.dify.workflow_url : '未配置' }}</dd>
        <template v-if="status?.dify?.probe">
          <dt>检测结果</dt>
          <dd>
            HTTP {{ status.dify.probe.http }}
            <template v-if="status.dify.probe.ok">
              · 输入项 {{ status.dify.probe.inputs }} 个
            </template>
            <template v-else>· {{ status.dify.probe.detail }}</template>
          </dd>
          <template v-if="status.dify.probe.opening_statement">
            <dt>开场白</dt>
            <dd>{{ status.dify.probe.opening_statement }}</dd>
          </template>
        </template>
      </dl>
    </div>

    <!-- ===== 语音 ===== -->
    <div class="a-chart-grid">
      <div class="a-card">
        <div class="a-card-head">
          <div class="a-card-title">
            <span class="a-dot" :class="status?.tts?.configured ? 'ok' : 'bad'" />&nbsp;语音合成（TTS）
          </div>
        </div>
        <dl class="a-kv">
          <dt>模型</dt>
          <dd>{{ status?.tts?.model || '—' }}</dd>
          <dt>API Key</dt>
          <dd>{{ status?.tts?.key || '未配置' }}</dd>
          <dt>默认音色</dt>
          <dd>{{ status?.tts?.default_voice || '—' }}</dd>
          <dt>可用音色</dt>
          <dd>{{ status?.tts?.voices ?? 0 }} 个</dd>
          <dt>单次字数上限</dt>
          <dd>{{ status?.tts?.max_chars ?? '—' }}</dd>
        </dl>
      </div>

      <div class="a-card">
        <div class="a-card-head">
          <div class="a-card-title">
            <span class="a-dot" :class="status?.asr?.configured ? 'ok' : 'bad'" />&nbsp;语音识别（ASR）
          </div>
        </div>
        <dl class="a-kv">
          <dt>模型</dt>
          <dd>{{ status?.asr?.model || '—' }}</dd>
          <dt>采样率</dt>
          <dd>{{ status?.asr?.sample_rate || '—' }} Hz</dd>
          <dt>单次时长上限</dt>
          <dd>{{ status?.asr?.max_seconds || '—' }} 秒</dd>
          <dt>基础热词</dt>
          <dd>{{ status?.asr?.hotwords_base ?? 0 }} 个</dd>
          <dt>题库热词</dt>
          <dd>
            {{ status?.asr?.hotwords_from_bank ?? 0 }} 个
            <span class="s-dim">（来自题库管理）</span>
          </dd>
        </dl>
      </div>
    </div>

    <!-- ===== 存储 ===== -->
    <div class="a-card">
      <div class="a-card-head">
        <div class="a-card-title">数据存储</div>
        <div class="a-card-sub">服务端的 JSON 数据文件</div>
      </div>
      <div class="a-stat-grid">
        <div v-for="s in storageStats" :key="s.label" class="a-stat">
          <span class="a-stat-label">{{ s.label }}</span>
          <div class="a-stat-value">{{ s.value }}</div>
          <div class="a-stat-note">{{ s.note }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Connection, InfoFilled } from '@element-plus/icons-vue'
import { fetchSystemStatusAPI, adminErrorText } from '@/api/admin.js'

const status = ref(null)
const loading = ref(false)
const probing = ref(false)

const difyDot = computed(() => {
  const d = status.value?.dify
  if (!d?.configured) return 'bad'
  if (d.probe) return d.probe.ok ? 'ok' : 'bad'
  return 'warn'
})

const storageStats = computed(() => {
  const s = status.value?.storage
  if (!s) return []
  return [
    { label: '账号', value: s.users, note: 'users.json' },
    { label: '岗位', value: s.positions, note: 'positions.json' },
    { label: '题目', value: s.questions, note: 'questions.json' },
    { label: '面试记录', value: s.records, note: 'interview_records.json' }
  ]
})

async function load(probe) {
  if (probe) probing.value = true
  else loading.value = true
  try {
    const { data } = await fetchSystemStatusAPI(probe)
    status.value = data
    if (probe) ElMessage.success('检测完成')
  } catch (e) {
    ElMessage.error(adminErrorText(e, '读取系统状态失败'))
  } finally {
    loading.value = false
    probing.value = false
  }
}

onMounted(() => load(false))
</script>

<style scoped>
.s-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 13px;
  border-radius: var(--rad-block);
  border: 1px solid var(--accent-line);
  background: var(--accent-wash);
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--body);
}
.s-note b {
  color: var(--accent-hover);
}
.s-note code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--accent-wash-2);
}
.a-card-title {
  display: flex;
  align-items: center;
}
.s-verdict {
  font-size: 12px;
  font-weight: 600;
  color: var(--success);
}
.s-verdict.bad {
  color: var(--danger);
}
.s-dim {
  color: var(--body-muted);
  font-family: inherit;
}
</style>
