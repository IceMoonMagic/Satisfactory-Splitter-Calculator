<script lang="ts" setup>
import { instance } from "@viz-js/viz"
import { computed, ref } from "vue"
import {
  ConveyorNode,
  findEdgesAndNodes,
  findLoopBackBottlenecks,
  NODE_TYPES,
} from "../../ConveyorNode.ts"
import GraphExport from "./GraphExport.vue"

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
    let label: string = node.sum_outs.toString(),
      shape: string = ""
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
  instance().then((viz) => {
    graphviz_svg.value = viz.renderSVGElement(output)
    graphviz_svg.value.style.height = "unset"
    const given_width = graphviz_svg.value.width.baseVal.valueAsString
    graphviz_svg.value.style["max-width"] = `min(${given_width}, 100%)`
  })
  return output
})

const graphviz_svg = ref<SVGSVGElement>(null)

const link = computed(() => {
  const GRAPHVIZ_URL = "https://dreampuf.github.io/GraphvizOnline/#"
  return as_dot.value ? GRAPHVIZ_URL + encodeURI(as_dot.value) : ""
})
</script>

<template>
  <!-- Use https://prismjs.com/ for highlighting  -->
  <GraphExport
    :link="link"
    :svg="graphviz_svg"
    :text="as_dot"
    filename="SplitResult.dot"
    mime="text/vnd.graphviz"
  />
  <div
    class="max-w-fill h-fit content-center overflow-hidden rounded-lg bg-white [&>svg]:m-auto"
    v-html="graphviz_svg.outerHTML"
    v-if="graphviz_svg !== null"
  />
  <details>
    <summary>Text Output</summary>
    <textarea
      :rows="as_dot.split(/\n/).length"
      class="w-full whitespace-pre rounded-lg p-2 font-mono"
      readonly
      >{{ as_dot }}</textarea
    >
  </details>
</template>
