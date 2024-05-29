<script setup lang="ts">
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { NoSymbolIcon } from '@heroicons/vue/16/solid'
const props = defineProps({
  working: {type: Boolean, required:true},
  working_text: {type: String, default: "Calculating"},
  idle_text: {type: String, default: "Calculate"}
})

const emits = defineEmits({
  start: null,
  abort: null
})
</script>

<template>
  <div class="flex gap-2">
    <button 
    class="latte bg-peach disabled:motion-safe:animate-pulse text-base w-full flex items-center justify-center"
    @click="$emit('start')" :disabled="props.working"
    >
    <ArrowPathIcon 
    class="size-5 latte text-base motion-safe:animate-spin mr-2" 
    v-if="props.working"
    />
    {{ !props.working ? props.idle_text : props.working_text }}
  </button>
  <button class="latte bg-red" @click="$emit('abort')" :disabled="!props.working">
    <NoSymbolIcon class="latte text-base size-5"/>
  </button>
</div>
</template>