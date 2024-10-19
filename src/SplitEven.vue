<script setup lang="ts">
import Decimal from 'decimal.js'
import { ref } from 'vue'
import { ConveyorNode, deserialize } from './ConveyorNode'
import InputList from './components/graphInputs/InputList.vue'
import GraphView from './components/graphOutputs/GraphView.vue'
import CalculateButton from './components/graphInputs/CalculateButton.vue'
import BeltBottlenecks from './components/graphInputs/BeltBottlenecks.vue'

const inputs = ref<Decimal[]>([new Decimal(3), new Decimal(-1)])
const bottleneck_threshold = ref<Decimal>(undefined)
const graph = ref<ConveyorNode[]>(null)
const calculating = ref<boolean>(false)
let worker = new Worker(new URL('./workers/splitEven.ts', import.meta.url))
worker.onmessage = worker_on_message

function calculate() {
  const filtered_inputs = inputs.value.filter(e => e.gt(0))
  if (filtered_inputs.length == 0 || Decimal.sum(...filtered_inputs).lt(2)) {
    return
  }
  calculating.value = true
  const message = {
    into: filtered_inputs.map(e => e.toNumber()),
    max_split: 3,
    bottleneck_threshold: bottleneck_threshold.value
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
  <div class="space-y-2">
    <InputList label="Sources" v-model="inputs" :decimal_places="0" />
    <BeltBottlenecks :inputs="[inputs]" v-model="bottleneck_threshold" />
    <CalculateButton :working="calculating" @start="calculate()" @abort="abort()" />
    <GraphView :graph="graph as ConveyorNode[]" />
  </div>
</template>