<script lang="ts" setup>
import { InformationCircleIcon } from "@heroicons/vue/16/solid"
import { ref } from "vue"
import MachineCount from "./components/MachineCount.vue"
import SplitEven from "./SplitEven.vue"
import SplitRatio from "./SplitRatio.vue"

const tabs = ref(["Split Ratio", "Split Evenly", "Machine Count"])
const curr_tab = ref(1)
</script>

<template>
  <div class="relative">
    <a
      class="absolute right-4"
      href="https://github.com/IceMoonMagic/Satisfactory-Splitter-Calculator"
      target="_blank"
    >
      <InformationCircleIcon class="size-5 text-text" />
    </a>
    <div class="mb-4 flex flex-wrap justify-center gap-2">
      <button
        :class="curr_tab === i ? 'underline decoration-peach' : ''"
        @click="curr_tab = i"
        v-for="i in tabs.length"
      >
        {{ tabs[i - 1] }}
      </button>
    </div>
    <div>
      <SplitRatio v-show="curr_tab === 1" />
      <SplitEven v-show="curr_tab === 2" />
      <MachineCount v-show="curr_tab === 3" />
    </div>
  </div>
</template>
