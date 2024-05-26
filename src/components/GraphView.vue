<script setup lang="ts">
import { computed } from 'vue'
import { ConveyorNode, NODE_TYPES, findEdgesAndNodes } from '../ConveyorNode.ts'
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
    let label: string = node.sum_outs.toString(), shape: string = ""
    switch (node.node_type) {
      case NODE_TYPES.Source:
        shape = "house"
        break
      case NODE_TYPES.Splitter:
        shape = "diamond"
        break
      case NODE_TYPES.Merger:
        shape = "square"
        break
      case NODE_TYPES.Destination:
        shape = "invhouse"
        label = node.sum_ins.toString()
        break
      default:
        label = `${node.sum_ins} | ${node.holding} | ${node.sum_outs}`
    }
    output += `\t${node.id} [label="${label}" shape="${shape}"];\n`
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

function click_link() {
  window.open(graphviz_link.value, "_blank")
}
</script>

<template>
  <!-- Use https://prismjs.com/ for highlighting  -->
<textarea readonly :rows="Math.min(as_dot.split(/\n/).length, 10)" class="font-mono rounded p-2 w-full">{{ as_dot }}</textarea>
<button @click="click_link()" :disabled="as_dot === ''" class="latte bg-blue text-base">View Online</button>
</template>