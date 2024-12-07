<script lang="ts" setup>
import { Fraction } from "fraction.js"
import { computed, ref } from "vue"
import SplitOptions from "./components/graphInputs/SplitOptions.vue"
import CalculateButton from "./components/graphInputs/CalculateButton.vue"
import InputList from "./components/graphInputs/InputList.vue"
import GraphView from "./components/graphOutputs/GraphView.vue"
import ToggleButton from "./components/ToggleButton.vue"
import { ConveyorNode, deserialize } from "./ConveyorNode"
import { countMultisetPermutations, sum } from "./math.ts"

const inputs = ref<Fraction[]>([new Fraction(60), new Fraction(-1)])
const outputs = ref<Fraction[]>(
  [30, -1, 15, 15, -1].map((e) => new Fraction(e)),
)
const bottleneck_threshold = ref<Fraction>(undefined)
const merge_level = ref<number>(undefined)
const smaller_first = ref<boolean>(true)
const graph = ref<ConveyorNode[]>(null)
const calculating = ref<boolean>(false)
let worker = new Worker(new URL("./workers/splitRatio.ts", import.meta.url))
worker.onmessage = worker_on_message
const BASE_CALC_TEXT = "Calculating"
const calc_text = ref(BASE_CALC_TEXT)

function calculate() {
  const sum_sources = sum(...inputs.value.filter((e) => e.gt(0)), 0)
  const sum_targets = sum(...outputs.value.filter((e) => e.gt(0)), 0)

  if (sum_sources.equals(0) && sum_targets.equals(0)) {
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
    into: outputs.value.filter((e) => e.gt(0)).map((e) => e.valueOf()),
    from: inputs.value.filter((e) => e.gt(0)).map((e) => e.valueOf()),
    max_split: 3,
    max_merge: 3,
    ratio_perms: try_perms.value,
    bottleneck_threshold: bottleneck_threshold.value?.valueOf(),
    merge_level: merge_level.value,
    smaller_first: smaller_first.value,
  }
  // console.debug(message)
  worker.postMessage(message)
}

function abort() {
  worker.terminate()
  worker = new Worker(new URL("./workers/splitRatio.ts", import.meta.url))
  worker.onmessage = worker_on_message
  calculating.value = false
}

function worker_on_message(e: MessageEvent) {
  if (typeof e.data === "string") {
    // console.debug(e.data)
    calc_text.value = `${BASE_CALC_TEXT} ${e.data}`
    return
  }
  // Could alternatively do in `main` and `main_split`,
  // but then each graph would have to un-proxy the object
  ConveyorNode.reset_ids()
  graph.value = deserialize(e.data)
  calculating.value = false
}

const num_perms = computed(() =>
  countMultisetPermutations(inputs.value.filter((e) => e.gt(0))).mul(
    countMultisetPermutations(outputs.value.filter((e) => e.gt(0))),
  ),
)
const try_perms = ref(false)

// graph.value = [new ConveyorNode(new Decimal(5))]
// graph.value.push(new ConveyorNode(new Decimal(5)))
// graph.value[0].link_to(graph.value[1])
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap sm:flex-nowrap">
      <InputList :allow_decimal="true" label="Sources" v-model="inputs" />
      <InputList :allow_decimal="true" label="Targets" v-model="outputs" />
    </div>
    <SplitOptions
      :inputs="[inputs, outputs]"
      v-model:belt_limit="bottleneck_threshold"
      v-model:merge_level="merge_level"
      v-model:smaller_first="smaller_first"
    />
    <ToggleButton
      title="Calculate all permutations and return the simplest"
      v-model="try_perms"
    >
      Try All ({{ num_perms.valueOf().toFixed() }}) Permutations
    </ToggleButton>
    <CalculateButton
      :working="calculating"
      :working_text="calc_text"
      @abort="abort()"
      @start="calculate()"
    />
    <GraphView :graph="graph as ConveyorNode[]" />
  </div>
</template>
