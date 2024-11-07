<script lang="ts" setup>
import Decimal from "decimal.js"
import { Id } from "vis-network/declarations/network/modules/components/edges"
import {
  Color,
  DataSet,
  Edge,
  Network,
  Node,
  Options,
} from "vis-network/standalone"
import { computed, onMounted, ref, useTemplateRef, watch } from "vue"
import {
  ConveyorNode,
  findEdgesAndNodes,
  NODE_TYPES,
} from "../../ConveyorNode.ts"
import GraphVisAddModal from "./GraphVisAddModal.vue"

const GREEN: Color = {
  border: "#40a02b",
  background: "#a6e3a1",
  highlight: {
    border: "#40a02b",
    background: "#a6e3a1",
  },
}
const GREEN_EDGE = {
  color: GREEN.border,
  highlight: GREEN.border,
}
const RED: Color = {
  border: "#e64553",
  background: "#eba0ac",
  highlight: {
    border: "#e64553",
    background: "#eba0ac",
  },
}
const RED_EDGE = {
  color: RED.border,
  highlight: RED.border,
}
let network: Network = null
const props = defineProps({
  graph: Array<ConveyorNode>,
})

const options: Options = {
  interaction: {
    navigationButtons: true,
  },
  layout: {
    randomSeed: 2,
    hierarchical: false,
  },
  edges: {
    arrows: "to",
    smooth: false, // FixMe: Multiple identical edges look like only one
  },
  nodes: {
    shape: "circle",
  },
  physics: false,
  manipulation: {
    initiallyActive: true,
    addNode: (nodeData: Node, _callback: Function) => {
      addNodeData.value = nodeData
    },
    addEdge: addEdge,
    editEdge: false,
    deleteNode: deleteNode,
    deleteEdge: deleteEdge,
  },
}
const hierarchical = ref(options.layout.hierarchical)
watch(hierarchical, (updated) => {
  options.layout.hierarchical = updated
  network.setOptions(options)
  // Needs to be done separately for some reason
  options.physics = false
  network.setOptions(options)
})

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
  addNode(
    [new Decimal(3)],
    [1, 1, 1].map((e) => new Decimal(e)),
  )
})

const addNodeData = ref<Node>(undefined)

function addIns(to: Id, ...ins: (Decimal | string)[]) {
  const addedIds = data.value.nodes.add(
    ins.map((value) => {
      return { label: value.toString(), color: RED }
    }),
  )
  data.value.edges.add(
    addedIds.map((id) => {
      return { from: id, to: to, color: RED_EDGE }
    }),
  )
}

function addOuts(from: Id, ...outs: (Decimal | string)[]) {
  const addedIds = data.value.nodes.add(
    outs.map((value) => {
      return { label: value.toString(), color: GREEN }
    }),
  )
  data.value.edges.add(
    addedIds.map((id) => {
      return { from: from, to: id, color: GREEN_EDGE }
    }),
  )
}

function addNode(ins: Decimal[], outs: Decimal[]) {
  // let { nd: nodeData, cb: cb } = addModelOpen.value
  let nodeData = (addNodeData.value || { x: 0, y: 0 }) as Node
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
  addIns(newNodeId, ...ins)
  addOuts(newNodeId, ...outs)
}

function addEdge(edgeData: Edge, callback: Function) {
  const fromNode = data.value.nodes.get(edgeData.from)
  const toNode = data.value.nodes.get(edgeData.to)

  if (fromNode.color != GREEN || toNode.color != RED) {
    return
  }
  if (!new Decimal(fromNode.label).equals(toNode.label)) {
    return
  }

  edgeData = {
    from: network.getConnectedNodes(fromNode.id)[0] as Id,
    to: network.getConnectedNodes(toNode.id)[0] as Id,
    label: fromNode.label,
  }
  callback(edgeData)
  data.value.nodes.remove([fromNode.id, toNode.id])
}

function deleteEdge(
  selected: { nodes: Id[]; edges: Id[] },
  callback: Function,
) {
  const edge = data.value.edges.get(selected.edges[0])
  const fromNode = data.value.nodes.get(edge.from)
  const toNode = data.value.nodes.get(edge.to)
  if (fromNode.color == RED || toNode.color == GREEN) {
    callback({ nodes: [], edges: [] })
    return
  }
  callback(selected)
  addIns(toNode.id, edge.label)
  addOuts(fromNode.id, edge.label)
}

function deleteNode(
  selected: { nodes: Id[]; edges: Id[] },
  callback: Function,
) {
  const node = data.value.nodes.get(selected.nodes[0])
  callback({ nodes: [], edges: [] }) // Has issues if not called, but also issues if called after updating
  if (node.color == RED || node.color == GREEN) {
    return
  }
  network
    .getConnectedEdges(node.id)
    .map((id) => data.value.edges.get(id))
    .filter((edge) => edge.color != RED_EDGE && edge.color != GREEN_EDGE)
    .forEach((edge) =>
      edge.from == node.id
        ? addIns(edge.to, edge.label)
        : addOuts(edge.from, edge.label),
    )
  data.value.nodes.remove(
    network
      .getConnectedNodes(node.id)
      .map((id) => data.value.nodes.get(id as Id))
      .filter((node) => node.color == RED || node.color == GREEN)
      .map((node) => node.id)
      .concat(selected.nodes),
  )
  // callback(selected)
}
</script>

<template>
  <!-- Use https://prismjs.com/ for highlighting  -->
  <!-- <GraphExport :text="JSON.stringify(as_vis)" :svg="graphviz_svg" :link="link" mime="text/vnd.graphviz"
    filename="SplitResult.dot" /> -->
  <GraphVisAddModal
    :addNode="addNode"
    @close="addNodeData = undefined"
    v-if="addNodeData !== undefined"
  />
  <button @click="network.stabilize()">Stabilize</button>
  <span
    ><input type="checkbox" v-model="hierarchical" /><label
      >Hierarchical</label
    ></span
  >
  <div class="latte h-96 bg-base text-text" ref="visDiv" />
  <!-- <textarea readonly class="font-mono rounded-lg p-2 w-full">{{ JSON.stringify(as_vis) }}</textarea> -->
</template>
