import { Decimal } from "decimal.js"
import {
  ConveyorNode,
  even_split,
  find_loopback_bottlenecks,
  replace_loopback_bottleneck,
  serialize,
} from "../ConveyorNode"

onmessage = (e) => {
  const into = e.data.into
  const max_split = e.data.max_split
  const bottleneck_threshold = e.data.bottleneck_threshold
  const graph = main_split(into, max_split, bottleneck_threshold)

  const keys = serialize(...graph)
  postMessage(keys)
}

function main_split(
  into: Array<number | Decimal>,
  max_split: number = 3,
  bottleneck_threshold?: number | Decimal,
): ConveyorNode[] {
  const root_nodes = []
  for (let i of into) {
    const target = new Decimal(i)
    if (!target.mod(1).eq(0)) {
      throw new Error(`${target} is not a natural number / int.`)
    }
    const root_node = new ConveyorNode(target)
    const src_node = new ConveyorNode()
    root_node.link_to(src_node)
    even_split(src_node, target.toNumber(), max_split)
    root_nodes.push(root_node)
  }
  if (bottleneck_threshold != undefined) {
    find_loopback_bottlenecks(root_nodes, bottleneck_threshold).forEach(
      (edge) => replace_loopback_bottleneck(edge),
    )
  }
  return root_nodes
}
