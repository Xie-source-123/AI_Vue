<template>
  <div class="fr">
    <span class="fr-label">{{ label }}</span>
    <div class="fr-body">
      <button
        class="fr-tag"
        :class="{ active: modelValue === '' }"
        @click="$emit('update:modelValue', '')"
      >
        全部 <span class="fr-count">{{ total }}</span>
      </button>
      <button
        v-for="it in shown"
        :key="it.value"
        class="fr-tag"
        :class="{ active: modelValue === it.value }"
        @click="$emit('update:modelValue', it.value)"
      >
        {{ it.label }} <span class="fr-count">{{ it.count }}</span>
      </button>
      <button v-if="items.length > collapsedCount" class="fr-toggle" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
        <span class="fr-arrow" :class="{ up: expanded }">⌄</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  items: { type: Array, default: () => [] }, // [{value,label,count}]
  modelValue: { type: String, default: '' },
  total: { type: Number, default: 0 },
  collapsedCount: { type: Number, default: 8 }
})
defineEmits(['update:modelValue'])

const expanded = ref(false)
const shown = computed(() => (expanded.value ? props.items : props.items.slice(0, props.collapsedCount)))
</script>

<style scoped>
.fr {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 8px 0;
}
.fr + .fr {
  border-top: 1px dashed var(--hairline);
}
.fr-label {
  flex-shrink: 0;
  width: 52px;
  padding-top: 4px;
  font-size: 12.5px;
  color: var(--body-muted);
}
.fr-body {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 22px;
}
.fr-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: var(--body);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.fr-tag:hover {
  background: var(--accent-wash);
}
.fr-tag.active {
  background: var(--accent-wash-2);
  color: var(--accent);
  font-weight: 600;
}
.fr-count {
  font-size: 11.5px;
  color: var(--body-muted);
  font-variant-numeric: tabular-nums;
}
.fr-tag.active .fr-count {
  color: var(--accent);
}
.fr-toggle {
  border: 0;
  background: transparent;
  font-size: 12.5px;
  color: var(--accent);
  cursor: pointer;
  padding: 4px 6px;
}
.fr-arrow {
  display: inline-block;
  transition: transform var(--dur-fast) var(--ease-out);
}
.fr-arrow.up {
  transform: rotate(180deg);
}
</style>
