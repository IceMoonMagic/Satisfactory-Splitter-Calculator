<script setup lang="ts">
import Decimal from 'decimal.js'
import { ref } from 'vue'
import { ConveyorNode, deserialize } from './ConveyorNode'
import InputList from './components/InputList.vue'
import GraphView from './components/GraphView.vue'
import CalculateButton from './components/CalculateButton.vue'

const inputs = ref<Decimal[]>([new Decimal(3)])
const graph = ref<ConveyorNode[]>(null)
const calculating = ref<boolean>(false)
let worker = new Worker(new URL('./workers/splitEven.ts', import.meta.url))
worker.onmessage = worker_on_message

function calculate() {
  if (inputs.value.length == 0 || Decimal.sum(...inputs.value).lt(2)) {
      return
  }
  calculating.value = true
  const message = {
    into: inputs.value.filter(e => !e.eq(0)).map(e => e.toNumber()),
    max_split: 3}
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
  <div class="space-y-2">
    <InputList label="Sources" v-model="inputs" />
    <CalculateButton :working="calculating" @start="calculate()" @abort="abort()"/>
    <GraphView :graph="graph as ConveyorNode[]" />
  </div>
</template>