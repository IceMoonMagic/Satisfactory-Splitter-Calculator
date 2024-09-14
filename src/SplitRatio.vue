<script setup lang="ts">
import Decimal from 'decimal.js'
import { ref, computed } from 'vue'
import { ConveyorNode, deserialize } from './ConveyorNode'
import InputList from './components/InputList.vue'
import GraphView from './components/GraphView.vue'
import CalculateButton from './components/CalculateButton.vue'

const inputs = ref<Decimal[]>([new Decimal(60), new Decimal(-1)])
const outputs = ref<Decimal[]>([30, -1, 15, 15, -1].map((e) => new Decimal(e)))
const graph = ref<ConveyorNode[]>(null)
const calculating = ref<boolean>(false)
let worker = new Worker(new URL('./workers/splitRatio.ts', import.meta.url))
worker.onmessage = worker_on_message
const BASE_CALC_TEXT = 'Calculating'
const calc_text = ref(BASE_CALC_TEXT)

function calculate() {
  const sum_sources = Decimal.sum(...inputs.value.filter(e => e.gt(0)))
  const sum_targets = Decimal.sum(...outputs.value.filter(e => e.gt(0)))

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

  calc_text.value = BASE_CALC_TEXT
  calculating.value = true
  const message = {
    into: outputs.value.filter(e => e.gt(0)).map(e => e.toNumber()),
    from: inputs.value.filter(e => e.gt(0)).map(e => e.toNumber()),
    max_split: 3, max_merge: 3,
    ratio_perms: try_perms.value
  }
  // console.debug(message)
  worker.postMessage(message)
}

function abort() {
  worker.terminate()
  worker = new Worker(new URL('./workers/splitRatio.ts', import.meta.url))
  worker.onmessage = worker_on_message
  calculating.value = false
}

function worker_on_message(e: MessageEvent) {
  if (typeof (e.data) === 'string') {
    // console.debug(e.data)
    calc_text.value = `${BASE_CALC_TEXT} ${e.data}`
    return
  }
  const e_graph = deserialize(e.data)
  graph.value = e_graph
  calculating.value = false
}

const num_perms = computed(() => (
  inputs.value.filter(e => e.gt(0)).reduce<number>((factorial: number, _, i) => factorial * (i + 1), 1)
  * outputs.value.filter(e => e.gt(0)).reduce<number>((factorial: number, _, i) => factorial * (i + 1), 1)
))
const try_perms = ref(false)
</script>

<template>
  <div class=" space-y-2">
    <div class="flex gap-2 flex-wrap sm:flex-nowrap">
      <InputList label="Sources" v-model="inputs" />
      <InputList label="Targets" v-model="outputs" />
    </div>
    <div class="flex flex-wrap gap-2 justify-center">
      <span class="bg-overlay0 rounded-lg p-2">
        Calculate all ({{ num_perms }}) permutations and show simplest
      </span>
      <input type="checkbox" v-model="try_perms" />
    </div>
    <CalculateButton :working="calculating" :working_text="calc_text" @start="calculate()" @abort="abort()" />
    <GraphView :graph="graph as ConveyorNode[]" />
  </div>
</template>