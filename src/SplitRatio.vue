<script setup lang="ts">
import Decimal from 'decimal.js'
import { ref } from 'vue'
import { ConveyorNode, deserialize } from './ConveyorNode'
import InputList from './components/InputList.vue'
import GraphView from './components/GraphView.vue'
import CalculateButton from './components/CalculateButton.vue'

const inputs = ref<Decimal[]>([new Decimal(60)])
const outputs = ref<Decimal[]>([30, 15, 15].map((e) => new Decimal(e)))
const graph = ref<ConveyorNode[]>(null)
const calculating = ref<boolean>(false)
let worker = new Worker(new URL('./workers/splitRatio.ts', import.meta.url))
worker.onmessage = worker_on_message

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
    into: outputs.value.filter(e => !e.eq(0)).map(e => e.toNumber()), 
    from: inputs.value.filter(e => !e.eq(0)).map(e => e.toNumber()),
    max_split: 3, max_merge: 3,
    ratio_perms: false
  }
  worker.postMessage(message)
}

function abort() {
  worker.terminate()
  worker = new Worker(new URL('./workers/splitRatio.ts', import.meta.url))
  worker.onmessage = worker_on_message
  calculating.value = false
}

function worker_on_message(e: MessageEvent) {
  const e_graph = deserialize(e.data)
  graph.value = e_graph
  calculating.value = false
}
</script>

<template>
  <div class=" space-y-2">
    <div class="flex gap-2 flex-wrap sm:flex-nowrap">
      <InputList label="Sources" v-model="inputs" />
      <InputList label="Targets" v-model="outputs" />
    </div>
    <CalculateButton :working="calculating" @start="calculate()" @abort="abort()"/>
    <GraphView :graph="graph as ConveyorNode[]" />
  </div>
</template>