<script lang="ts" setup>
import { CheckCircleIcon, XCircleIcon } from "@heroicons/vue/16/solid"

const checked = defineModel<boolean>()
const props = defineProps({ flip: Boolean })
</script>

<template>
  <button
    :class="flip ? 'flex-row-reverse' : checked"
    @click="checked = !checked"
    class="inline-flex items-end gap-2 p-2"
  >
    <slot />
    <CheckCircleIcon class="inline size-5 text-green" v-if="checked" />
    <XCircleIcon class="inline size-5 text-red" v-else />
  </button>
</template>
