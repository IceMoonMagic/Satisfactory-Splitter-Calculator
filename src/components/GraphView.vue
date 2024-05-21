<script setup lang="ts">
import { computed } from 'vue'
import { ConveyorNode, findEdgesAndNodes } from '../ConveyorNode.ts'
const props = defineProps({
  graph: Array<ConveyorNode>,
})

const as_dot = computed(() => {
  if (props.graph == null) {
    return ""
  }
  const edgesAndNodes = findEdgesAndNodes(...props.graph)
  let output = "digraph G {\n"
  for (let node of edgesAndNodes.nodes) {
    output += `\t${node.id} [label="${node.sum_outs}"];\n`
  }

  for (let edge of edgesAndNodes.edges) {
    output += `\t${edge.src.id} -> ${edge.dst.id} [label="${edge.carrying}"];\n`
  }
  return output + "}"
})

const graphviz_link = computed(() => {
  const GRAPHVIZ_URL = 'https://dreampuf.github.io/GraphvizOnline/#'
  return as_dot.value ? GRAPHVIZ_URL + encodeURI(as_dot.value) : ""
})
</script>

<template>
<textarea readonly>{{ as_dot }}</textarea>
<a target="_blank" :href="graphviz_link">View Online</a>
</template>