<script setup lang="ts">
import { ref } from 'vue'
import SplitEven from './SplitEven.vue';
import SplitRatio from './SplitRatio.vue';
import MachineCount from './components/MachineCount.vue'
import { InformationCircleIcon } from '@heroicons/vue/16/solid';

const tabs = ref([
  "Split Ratio",
  "Split Evenly",
  "Machine Count"
])
const curr_tab = ref(1)
</script>

<template>
  <div class="relative">
    <a href="https://github.com/IceMoonMagic/Satisfactory-Splitter-Calculator" target="_blank"
    class="absolute right-4">
      <InformationCircleIcon class="size-5 text-text"/>    
    </a>
    <div class=" justify-center flex flex-wrap gap-2 mb-4">
      <button v-for="i in tabs.length"
      :class="curr_tab === i ? ' underline decoration-peach' : ''" 
      @click="curr_tab=i">
        {{ tabs[i-1] }}
      </button>
    </div>
    <div>
      <SplitRatio v-show="curr_tab === 1" />
      <SplitEven v-show="curr_tab === 2" />
      <MachineCount v-show="curr_tab === 3" />
    </div>
  </div>
</template>
