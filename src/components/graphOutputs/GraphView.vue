<script setup lang="ts">
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
  <select name="select_graph" v-model="renderer" class="rounded-lg p-2">
    <option>GraphViz</option>
    <option>Mermaid</option>
  </select>
  <ToggleButton class="m-2" v-model="highlight_bottleneck">
    Highlight Potential Bottlenecks?
  </ToggleButton>
  <div v-if="graph != undefined">
    <GraphGraphviz
      :graph="props.graph"
      :bottleneck="highlight_bottleneck"
      v-if="renderer === 'GraphViz'"
    />
    <GraphMermaid
      :graph="props.graph"
      :bottleneck="highlight_bottleneck"
      v-else-if="renderer === 'Mermaid'"
    />
  </div>
</template>
