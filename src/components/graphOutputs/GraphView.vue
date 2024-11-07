<script lang="ts" setup>
import { defineAsyncComponent, ref } from "vue"
import { ConveyorNode } from "../../ConveyorNode.ts"
import ToggleButton from "../ToggleButton.vue"

const GraphGraphviz = defineAsyncComponent(() => import("./GraphGraphviz.vue"))
const GraphMermaid = defineAsyncComponent(() => import("./GraphMermaid.vue"))

const props = defineProps({
  graph: Array<ConveyorNode>,
})

const renderer = ref("GraphViz")
const highlight_bottleneck = ref(false)
</script>

<template>
  <label for="select_graph">Choose Graph Renderer: </label>
  <select class="rounded-lg p-2" name="select_graph" v-model="renderer">
    <option>GraphViz</option>
    <option>Mermaid</option>
  </select>
  <ToggleButton class="m-2" v-model="highlight_bottleneck">
    Highlight Potential Bottlenecks?
  </ToggleButton>
  <div v-if="graph != undefined">
    <GraphGraphviz
      :bottleneck="highlight_bottleneck"
      :graph="props.graph"
      v-if="renderer === 'GraphViz'"
    />
    <GraphMermaid
      :bottleneck="highlight_bottleneck"
      :graph="props.graph"
      v-else-if="renderer === 'Mermaid'"
    />
  </div>
</template>
