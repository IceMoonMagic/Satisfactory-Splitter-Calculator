<script lang="ts" setup>
import { computed } from "vue"
import Decimal from "decimal.js"
import {
  ConveyorNode,
  deserialize,
  even_split,
  factor_split,
  find_edges_and_nodes,
  prime_split,
  serialize,
  smart_merge,
} from "../src/ConveyorNode"
import { prime_factorization } from "../src/math"
import GraphView from "./components/graphOutputs/GraphView.vue"

const graph = (() => {
  const splits = [2, 3].map((n) => new Decimal(n))
  const into = [1, 1, 1, 1, 1].map((n) => new Decimal(n))
  const max_merge = 3
  let root_node = new ConveyorNode(Decimal.sum(...into))
  let spacer_node = new ConveyorNode()
  root_node.link_to(spacer_node)
  let split_nodes = even_split(spacer_node, 5)
  // let end_nodes = smart_merge(split_nodes, into, max_merge)
  // console.log(find_edges_and_nodes(root_node))
  return [root_node]
})()
</script>

<template>
  <GraphView :graph="graph as ConveyorNode[]" />
</template>
