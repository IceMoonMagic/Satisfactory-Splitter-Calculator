<script setup lang="ts">
import { computed, ref } from 'vue'
import { ConveyorNode, NODE_TYPES, findEdgesAndNodes, findLoopBackBottlenecks } from '../ConveyorNode.ts'
import { instance } from "@viz-js/viz"
import GraphExport from './GraphExport.vue';

const props = defineProps({
  graph: Array<ConveyorNode>,
  bottleneck: Boolean,
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
  const bottlenecks = findLoopBackBottlenecks(props.graph)
  for (let edge of edgesAndNodes.edges) {
    output += `\t${edge.src.id} -> ${edge.dst.id} [label="${edge.carrying}"`
    if (props.bottleneck && bottlenecks.includes(edge)) {
      output += " penwidth=2.0"
    }
    output += "];\n"
  }
  output += "}"
  instance().then(viz => {
    graphviz_svg.value = viz.renderSVGElement(output)
    graphviz_svg.value.style.height = 'unset'
    const given_width = graphviz_svg.value.width.baseVal.valueAsString
    graphviz_svg.value.style['max-width'] = `min(${given_width}, 100%)`
  })
  return output
})

const graphviz_svg = ref<SVGSVGElement>(null)

const link = computed(() => {
  const GRAPHVIZ_URL = 'https://dreampuf.github.io/GraphvizOnline/#'
  return as_dot.value ? GRAPHVIZ_URL + encodeURI(as_dot.value) : ""
})
</script>

<template>
  <!-- Use https://prismjs.com/ for highlighting  -->
  <GraphExport :text="as_dot" :svg="graphviz_svg" :link="link" mime="text/vnd.graphviz" filename="SplitResult.dot" />
  <div v-html="graphviz_svg.outerHTML" v-if="graphviz_svg !== null"
    class="h-fit max-w-fill rounded-lg content-center bg-white [&>svg]:m-auto overflow-hidden" />
  <details>
    <summary>Text Output</summary>
    <textarea readonly :rows="as_dot.split(/\n/).length"
      class="font-mono rounded-lg p-2 w-full whitespace-pre">{{ as_dot }}</textarea>
  </details>
</template>