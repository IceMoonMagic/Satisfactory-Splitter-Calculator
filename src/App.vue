<script setup lang="ts">
import { ref } from 'vue'
import SplitEven from './SplitEven.vue';
import SplitRatio from './SplitRatio.vue';
import MachineCount from './components/MachineCount.vue'

const tabs = ref([
  "Split Ratio",
  "Split Evenly",
  "Machine Count"
])
const curr_tab = ref(1)
</script>

<template>
  <ui>
    <li v-for="i in 3">
      <button @click="curr_tab=i">{{ tabs[i-1] }}</button>
    </li>
  </ui>
  <SplitRatio v-if="curr_tab === 1" />
  <SplitEven v-if="curr_tab === 2" />
  <MachineCount v-if="curr_tab === 3" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
