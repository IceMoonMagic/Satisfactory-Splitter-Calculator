<script setup lang="ts">
import { CheckCircleIcon, XCircleIcon } from "@heroicons/vue/16/solid"

const checked = defineModel<boolean>()
const props = defineProps({ flip: Boolean })
</script>

<template>
  <button
    @click="checked = !checked"
    class="inline-flex items-end gap-2"
    :class="flip ? 'flex-row-reverse' : checked"
  >
    <slot />
    <CheckCircleIcon class="inline size-5 text-green" v-if="checked" />
    <XCircleIcon class="inline size-5 text-red" v-else />
  </button>
</template>
