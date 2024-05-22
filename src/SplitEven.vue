<script setup lang="ts">
import Decimal from 'decimal.js'
import { ref } from 'vue'
import { ConveyorNode, deserialize } from './ConveyorNode'
import InputList from './components/InputList.vue'
import GraphView from './components/GraphView.vue'

const inputs = ref<Decimal[]>([new Decimal(3)])
const graph = ref<ConveyorNode[]>(null)
const calculating = ref<boolean>(false)
const worker = new Worker(new URL('./workers/splitEven.ts', import.meta.url))

function calculate() {
  if (inputs.value.length == 0 || Decimal.sum(...inputs.value).eq(0)) {
      return
  }
  calculating.value = true
  const message = {into: inputs.value.map(e => e.toNumber()), max_split: 3}
  worker.postMessage(message)
}

worker.onmessage = (e) => {
  const e_graph = deserialize(e.data)
  graph.value = e_graph
  calculating.value = false
}
</script>

<template>
  <div>
    <InputList v-model="inputs" />
    <button @click="calculate()" :disabled="calculating">{{ !calculating ? "Calculate" : "Calculating" }}</button>
    <GraphView :graph="graph as ConveyorNode[]" />
  </div>
</template>