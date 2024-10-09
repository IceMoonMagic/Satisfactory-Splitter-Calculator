<script setup lang="ts">
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import { ConveyorNode, NODE_TYPES, findEdgesAndNodes } from '../ConveyorNode.ts'
import { DataSet, Network } from "vis-network/standalone";

let network: Network = null
const props = defineProps({
  graph: Array<ConveyorNode>,
})

const options = {
  interaction: {
    navigationButtons: true
  },
  layout: {
    randomSeed: 2,
    hierarchical: { enabled: true }
  },
  edges: {
    arrows: 'to',
    smooth: { enabled: false }
  },
  nodes: {
    shape: 'circle'
  },
  physics: { enabled: false },
  manipulation: {
    enabled: true
  }
};

const visDiv = useTemplateRef('visDiv')
const data = computed<{ nodes: DataSet, edges: DataSet }>(() => {
  if (props.graph == null) {
    // if (visDiv.value != null) { visDiv.value.innerHTML = '' }
    return null
  }
  const src_data = findEdgesAndNodes(...props.graph)
  const nodes = src_data.nodes.map((node) => {
    let n = { id: node.id, label: undefined, shape: undefined }
    switch (node.node_type) {
      case NODE_TYPES.Splitter:
      case NODE_TYPES.Source_Splitter:
        n.shape = 'diamond'
        break
      case NODE_TYPES.Merger:
      case NODE_TYPES.Merger_Destination:
        n.shape = 'square'
        break
      case NODE_TYPES.Island:
      case NODE_TYPES.Destination:
        n.label = node.holding.toString()
    }
    if (n.label == undefined) { n.label = node.sum_outs.toString() }
    if (n.shape == undefined) { n.shape = 'hexagon' }
    return n
  })
  const edges = src_data.edges.map((edge) => {
    return {
      from: edge.src.id,
      to: edge.dst.id,
      label: edge.carrying.toString()
    }
  })
  return {
    nodes: new DataSet(nodes),
    edges: new DataSet(edges)
  }
})

watch(data, (data) => { if (network != null) network.setData(data) })

onMounted(() => {
  // @ts-ignore
  network = new Network(visDiv.value, null, options);
  if (network != null) {
    // @ts-ignore
    network.setData(data.value)
  }
})
</script>

<template>
  <!-- Use https://prismjs.com/ for highlighting  -->
  <!-- <GraphExport :text="JSON.stringify(as_vis)" :svg="graphviz_svg" :link="link" mime="text/vnd.graphviz"
    filename="SplitResult.dot" /> -->
  <div ref="visDiv" class="latte text-text bg-base h-96" />
  <!-- <textarea readonly class="font-mono rounded-lg p-2 w-full">{{ JSON.stringify(as_vis) }}</textarea> -->
</template>