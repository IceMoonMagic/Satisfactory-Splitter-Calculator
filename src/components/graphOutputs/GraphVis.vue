<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from "vue"
import {
  ConveyorNode,
  findEdgesAndNodes,
  NODE_TYPES,
} from "../../ConveyorNode.ts"
import { Data, DataSet, Node, Edge, Network } from "vis-network/standalone"
import GraphVisAddModal from "./GraphVisAddModal.vue"
import Decimal from "decimal.js"
import { Id } from "vis-network/declarations/network/modules/components/edges"

let network: Network = null
const props = defineProps({
  graph: Array<ConveyorNode>,
})

const options = {
  interaction: {
    navigationButtons: true,
  },
  layout: {
    randomSeed: 2,
    hierarchical: { enabled: false },
  },
  edges: {
    arrows: "to",
    smooth: { enabled: false },
  },
  nodes: {
    shape: "circle",
  },
  physics: { enabled: false },
  manipulation: {
    enabled: true,
    addNode: (nodeData: object, callback: Function) => {
      addModelOpen.value = { cb: callback, nd: nodeData }
    },
    addEdge: addEdge,
    editEdge: false,
    deleteNode: (selected: Data, callback: Function) => {
      console.log(selected, callback)
      callback(selected)
    },
    deleteEdge: (selected: Data, callback: Function) => {
      console.log(selected, callback)
      callback(selected)
    },
  },
}

const visDiv = useTemplateRef("visDiv")
const data = computed<{ nodes: DataSet<Node>; edges: DataSet<Edge> }>(() => {
  if (props.graph == null) {
    // if (visDiv.value != null) { visDiv.value.innerHTML = '' }
    return null
  }
  const src_data = findEdgesAndNodes(...props.graph)
  const nodes = src_data.nodes.map((node) => {
    let n: Node = { id: node.id, label: undefined, shape: undefined }
    switch (node.node_type) {
      case NODE_TYPES.Splitter:
      case NODE_TYPES.Source_Splitter:
        n.shape = "diamond"
        break
      case NODE_TYPES.Merger:
      case NODE_TYPES.Merger_Destination:
        n.shape = "square"
        break
      case NODE_TYPES.Island:
      case NODE_TYPES.Destination:
        n.label = node.holding.toString()
    }
    if (n.label == undefined) {
      n.label = node.sum_outs.toString()
    }
    if (n.shape == undefined) {
      n.shape = "hexagon"
    }
    return n
  })
  const edges: Edge[] = src_data.edges.map((edge) => {
    return {
      from: edge.src.id,
      to: edge.dst.id,
      label: edge.carrying.toString(),
    }
  })
  return {
    nodes: new DataSet(nodes),
    edges: new DataSet(edges),
  }
})

watch(data, (data) => {
  if (network != null) network.setData(data)
})

onMounted(() => {
  // @ts-ignore
  network = new Network(visDiv.value, null, options)
  if (network != null) {
    // @ts-ignore
    network.setData(data.value)
  }
})

const addModelOpen = ref<{ cb: Function; nd: object }>(undefined)

function addNode(ins: Decimal[], outs: Decimal[]) {
  // let { nd: nodeData, cb: cb } = addModelOpen.value
  let nodeData = addModelOpen.value.nd as any
  if (ins.length + outs.length === 0) {
    return
  } else if (ins.length <= 1 && outs.length <= 1) {
    nodeData.label = ins[0]?.toString() || outs[0].toString()
    nodeData.shape = "hexagon"
  } else {
    nodeData.label = Decimal.max(
      Decimal.sum(...ins),
      Decimal.sum(...outs),
    ).toString()
    nodeData.shape = outs.length > 1 ? "diamond" : "square"
  }
  const newNodeId: Id = data.value.nodes.add([nodeData])[0]
  const inNodeIds: Id[] = data.value.nodes.add(
    ins.map((value) => {
      return { label: value.toString(), color: "red" }
    }),
  )
  const outNodeIds: Id[] = data.value.nodes.add(
    outs.map((value) => {
      return { label: value.toString(), color: "green" }
    }),
  )
  data.value.edges.add(
    inNodeIds.map((value) => {
      return { from: value, to: newNodeId, color: "black" }
    }),
  )
  data.value.edges.add(
    outNodeIds.map((value) => {
      return { from: newNodeId, to: value, color: "black" }
    }),
  )
}

function addEdge(edgeData: Edge, callback: Function) {
  const fromNode = data.value.nodes.get(edgeData.from)
  const toNode = data.value.nodes.get(edgeData.to)

  if (fromNode.color != "green" || toNode.color != "red") {
    return
  }
  if (!new Decimal(fromNode.label).equals(toNode.label)) {
    return
  }

  edgeData = {
    from: network.getConnectedNodes(fromNode.id)[0],
    to: network.getConnectedNodes(toNode.id)[0],
    label: fromNode.label,
  }
  callback(edgeData)
  data.value.nodes.remove([fromNode.id, toNode.id])
}
</script>

<template>
  <!-- Use https://prismjs.com/ for highlighting  -->
  <!-- <GraphExport :text="JSON.stringify(as_vis)" :svg="graphviz_svg" :link="link" mime="text/vnd.graphviz"
    filename="SplitResult.dot" /> -->
  <GraphVisAddModal
    v-if="addModelOpen !== undefined"
    @close="addModelOpen = undefined"
    :addNode="addNode"
  />
  <div ref="visDiv" class="latte h-96 bg-base text-text" />
  <!-- <textarea readonly class="font-mono rounded-lg p-2 w-full">{{ JSON.stringify(as_vis) }}</textarea> -->
</template>
