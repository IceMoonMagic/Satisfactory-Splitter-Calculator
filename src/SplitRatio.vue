<script setup lang="ts">
import Decimal from 'decimal.js'
import { ref } from 'vue'
import { ConveyorNode, deserialize } from './ConveyorNode'
import InputList from './components/InputList.vue'
import GraphView from './components/GraphView.vue'

const inputs = ref<Decimal[]>([new Decimal(60)])
const outputs = ref<Decimal[]>([30, 15, 15].map((e) => new Decimal(e)))
const graph = ref<ConveyorNode[]>(null)
const calculating = ref<boolean>(false)
const worker = new Worker(new URL('./workers/splitRatio.ts', import.meta.url))

function calculate() {
  const sum_sources = Decimal.sum(...inputs.value)
  const sum_targets = Decimal.sum(...outputs.value)
  
  if (sum_sources.eq(0) && sum_targets.eq(0)) {
    return
    
  } else if (sum_sources.lt(sum_targets)) {
    const diff = sum_targets.sub(sum_sources)
    inputs.value.push(diff)
    // return calculate()
  } else if (sum_targets.lt(sum_sources)) {
    const diff = sum_sources.sub(sum_targets)
    outputs.value.push(diff)
    // return calculate()
  }
  
  calculating.value = true
  const message = {
    into: outputs.value.map(e => e.toNumber()), 
    from: inputs.value.map(e => e.toNumber()),
    max_split: 3, max_merge: 3,
    ratio_perms: false
  }
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
    <InputList v-model="outputs" />
    <button @click="calculate()" :disabled="calculating">{{ !calculating ? "Calculate" : "Calculating" }}</button>
    <GraphView :graph="graph as ConveyorNode[]" />
  </div>
</template>