<script setup lang="ts">
import { ref } from 'vue';
import { ConveyorNode } from '../ConveyorNode.ts'
import GraphGraphviz from './GraphGraphviz.vue';
import GraphMermaid from './GraphMermaid.vue'

const props = defineProps({
  graph: Array<ConveyorNode>,
})

const renderer = ref('GraphViz')
</script>

<template>
<label for="select_graph">Choose Graph Renderer: </label>
<select name="select_graph" v-model="renderer"
  class="p-2 rounded-lg"
>
  <option>GraphViz</option>
  <option>Mermaid</option>
</select>
<GraphGraphviz :graph="props.graph" v-if="renderer === 'GraphViz'" />
<GraphMermaid :graph="props.graph" v-else-if="renderer === 'Mermaid'" />
</template>