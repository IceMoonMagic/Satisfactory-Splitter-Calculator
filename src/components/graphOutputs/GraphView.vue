<script setup lang="ts">
import { ref } from 'vue';
import { ConveyorNode } from '../../ConveyorNode.ts'
import GraphGraphviz from './GraphGraphviz.vue';
import GraphMermaid from './GraphMermaid.vue'

const props = defineProps({
  graph: Array<ConveyorNode>,
})

const renderer = ref('GraphViz')
const highlight_bottleneck = ref(false)
</script>

<template>
  <label for="select_graph">Choose Graph Renderer: </label>
  <select name="select_graph" v-model="renderer" class="p-2 rounded-lg">
    <option>GraphViz</option>
    <option>Mermaid</option>
  </select>
  <label for="highlight_bottleneck" class="ml-4 mr-2">Highlight Potential Bottlenecks?</label>
  <input type="checkbox" name="highlight_bottleneck" v-model="highlight_bottleneck" />
  <GraphGraphviz :graph="props.graph" :bottleneck="highlight_bottleneck" v-if="renderer === 'GraphViz'" />
  <GraphMermaid :graph="props.graph" :bottleneck="highlight_bottleneck" v-else-if="renderer === 'Mermaid'" />
</template>