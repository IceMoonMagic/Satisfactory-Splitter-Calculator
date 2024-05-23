<script setup lang="ts">
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
const props = defineProps({
  working: {type: Boolean, required:true},
  working_text: {type: String, default: "Calculating"},
  idle_text: {type: String, default: "Calculate"}
})

const emits = defineEmits({
  click: null
})
</script>

<template>
<button 
  class="mt-2 latte bg-peach disabled:motion-safe:animate-pulse text-base w-full flex items-center justify-center"
  @click="$emit('click')" :disabled="props.working"
>
  <ArrowPathIcon 
    class="size-5 latte text-base motion-safe:animate-spin mr-2" 
    v-if="props.working"
  />
  {{ !props.working ? props.idle_text : props.working_text }}
</button>
</template>