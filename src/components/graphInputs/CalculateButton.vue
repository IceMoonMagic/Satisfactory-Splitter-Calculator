<script lang="ts" setup>
import { NoSymbolIcon } from "@heroicons/vue/16/solid"
import { ArrowPathIcon } from "@heroicons/vue/24/outline"

const props = defineProps({
  working: { type: Boolean, required: true },
  working_text: { type: String, default: "Calculating" },
  idle_text: { type: String, default: "Calculate" },
})

const emits = defineEmits({
  start: null,
  abort: null,
})
</script>

<template>
  <div class="flex gap-2">
    <button
      :disabled="props.working"
      @click="$emit('start')"
      class="colored flex w-full items-center justify-center bg-peach disabled:motion-safe:animate-pulse"
    >
      <ArrowPathIcon
        class="colored mr-2 size-5 motion-safe:animate-spin"
        v-if="props.working"
      />
      {{ !props.working ? props.idle_text : props.working_text }}
    </button>
    <button
      :disabled="!props.working"
      @click="$emit('abort')"
      class="colored bg-red"
    >
      <NoSymbolIcon class="colored size-5" />
    </button>
  </div>
</template>
