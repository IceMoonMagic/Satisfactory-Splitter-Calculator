<script lang="ts" setup>
import { Fraction } from "fraction.js"
import { ref } from "vue"
import SplitOptions from "./components/graphInputs/SplitOptions.vue"
import CalculateButton from "./components/graphInputs/CalculateButton.vue"
import InputList from "./components/graphInputs/InputList.vue"
import GraphView from "./components/graphOutputs/GraphView.vue"
import { ConveyorNode, deserialize } from "./ConveyorNode"
import { sum } from "./math.ts"

const inputs = ref<Fraction[]>([new Fraction(3), new Fraction(-1)])
const bottleneck_threshold = ref<Fraction>(undefined)
const merge_level = ref<number>(undefined)
const smaller_first = ref<boolean>(true)
const graph = ref<ConveyorNode[]>(null)
const calculating = ref<boolean>(false)
let worker = new Worker(new URL("./workers/splitEven.ts", import.meta.url))
worker.onmessage = worker_on_message

function calculate() {
  const filtered_inputs = inputs.value.filter((e) => e.gt(0))
  if (filtered_inputs.length == 0 || sum(...filtered_inputs).lt(2)) {
    return
  }
  calculating.value = true
  const message = {
    into: filtered_inputs.map((e) => e.valueOf()),
    max_split: 3,
    bottleneck_threshold: bottleneck_threshold.value?.valueOf(),
    merge_level: merge_level.value,
    smaller_first: smaller_first.value,
  }
  worker.postMessage(message)
}

function abort() {
  worker.terminate()
  worker = new Worker(new URL("./workers/splitRatio.ts", import.meta.url))
  worker.onmessage = worker_on_message
  calculating.value = false
}

function worker_on_message(e: MessageEvent) {
  graph.value = deserialize(e.data)
  calculating.value = false
}
</script>

<template>
  <div class="space-y-2">
    <InputList :allow_decimal="false" label="Sources" v-model="inputs" />
    <SplitOptions
      :inputs="[inputs]"
      v-model:belt_limit="bottleneck_threshold"
      v-model:merge_level="merge_level"
      v-model:smaller_first="smaller_first"
    />
    <CalculateButton
      :working="calculating"
      @abort="abort()"
      @start="calculate()"
    />
    <GraphView :graph="graph as ConveyorNode[]" />
  </div>
</template>
