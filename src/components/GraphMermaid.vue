<script setup lang="ts">
import { computed, ref } from 'vue'
import { ConveyorNode, NODE_TYPES, findEdgesAndNodes, findLoopBackBottlenecks } from '../ConveyorNode.ts'
import VueMermaidString from 'vue-mermaid-string'
import { deflate } from 'pako'
import { fromUint8Array } from 'js-base64'
import GraphExport from './GraphExport.vue'

const props = defineProps({
  graph: Array<ConveyorNode>,
  bottleneck: Boolean,
})

const as_mermaid = computed(() => {
  if (props.graph == null) {
    return ""
  }
  const shapes = {
    rect: (label: String) => `[${label}]`,
    round: (label: String) => `(${label})`,
    stadium: (label: String) => `([${label}])`,
    subroutine: (label: String) => `[[${label}]]`,
    cylindrical: (label: String) => `[(${label})]`,
    circle: (label: String) => `((${label}))`,
    asymmetric: (label: String) => `>${label}]`,
    rhombus: (label: String) => `{${label}}`,
    hexagon: (label: String) => `{{${label}}}`,
    parallelogram: (label: String) => `[/${label}/]`,
    parallelogram_alt: (label: String) => `[\\${label}\\]`,
    trapezoid: (label: String) => `[/${label}\\]`,
    trapezoid_alt: (label: String) => `[\\${label}/]`,
    circle_double: (label: String) => `(((${label})))`,
  }
  const edgesAndNodes = findEdgesAndNodes(...props.graph)
  let output = "flowchart TD\n"
  for (let node of edgesAndNodes.nodes) {
    let label: String
    switch (node.node_type) {
      case NODE_TYPES.Source:
        label = shapes.trapezoid(node.sum_outs.toString())
        break
      case NODE_TYPES.Splitter:
        label = shapes.rhombus(node.sum_outs.toString())
        break
      case NODE_TYPES.Merger:
        label = shapes.rect(node.sum_outs.toString())
        break
      case NODE_TYPES.Destination:
        label = shapes.trapezoid_alt(node.sum_ins.toString())
        break
      default:
        label = shapes.hexagon(`${node.sum_ins} | ${node.holding} | ${node.sum_outs}`)
    }
    output += `\t${node.id}${label}\n`
  }

  const bottlenecks = findLoopBackBottlenecks(props.graph)
  for (let edge of edgesAndNodes.edges) {
    if (props.bottleneck && bottlenecks.includes(edge)) {
      output += `\t${edge.src.id} == ${edge.carrying} ==> ${edge.dst.id}\n`
    } else {
      output += `\t${edge.src.id} -- ${edge.carrying} --> ${edge.dst.id}\n`
    }
  }
  return output
})

const link = computed(() => {
  // https://github.com/mermaid-js/mermaid-live-editor/blob/ca03a85221bdf5c947e716e11c998277af7ecaa9/src/lib/util/serde.ts#L21-L23
  const obj = {
    "code": as_mermaid.value,
    // I don't know how much of this is needed, but at least some of it is
    "mermaid": "{\n  \"theme\": \"default\"\n}",
    "autoSync": true,
    "updateDiagram": true,
    "panZoom": true,
    "pan": { "x": 1, "y": 1 },
    "zoom": 1,
    "editorMode": "code",
    "rough": false
  }
  const data = new TextEncoder().encode(JSON.stringify(obj))
  const compressed = deflate(data, { level: 9 })
  const pako_section = fromUint8Array(compressed, true)
  return `https://mermaid.live/edit#pako:${pako_section}`
})

const svg = ref<SVGSVGElement>(null)
</script>

<template>
  <!-- Use https://prismjs.com/ for highlighting  -->
  <GraphExport :text="as_mermaid" :svg="svg" :link="link" mime="application/vnd.mermaid" filename="SplitResult.mmd" />
  <VueMermaidString ref="svg" :value="as_mermaid"
    class="h-fit max-w-fill rounded-lg content-center bg-white [&>svg]:m-auto" />
  <details>
    <summary>Text Output</summary>
    <textarea readonly :rows="as_mermaid.split(/\n/).length"
      class="font-mono rounded-lg p-2 w-full whitespace-pre">{{ as_mermaid }}</textarea>
  </details>
</template>