<script lang="ts" setup>
import Decimal from "decimal.js"
import { ref } from "vue"
import {
  basic_factorized_split_finisher,
  factorized_split,
  main_split,
} from "./calculate.ts"
import GraphView from "./components/graphOutputs/GraphView.vue"
import { clean_up_graph, ConveyorNode } from "./ConveyorNode.ts"

const graph = ref([])
/* [Toggle]
function debug_graph(
  target: number,
  flip: boolean = false,
  level: number = -1,
  merger: number = 3,
) {
  const _target = new Decimal(target)
  const root_node = new ConveyorNode(_target)
  const spacer_node = new ConveyorNode()
  root_node.link_to(spacer_node)
  // prettier-ignore
  const { leaves: leaf_nodes, merge_to: merge_ins } =
    factorized_split(spacer_node, _target, flip, merger, level)
  // return merge_ins.concat(root_node)
  basic_factorized_split_finisher(merge_ins, leaf_nodes)
  clean_up_graph([root_node])
  graph.value = [root_node]
}
/*/
function debug_graph(...targets: number[]) {
  graph.value = main_split(targets.map((n) => new Decimal(n)))
}
debug_graph(10)
//*/

// @ts-ignore
window.debug_graph = debug_graph
</script>

<template>
  <GraphView :graph="graph as ConveyorNode[]" />
</template>
