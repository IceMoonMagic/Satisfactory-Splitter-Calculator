import Decimal from "decimal.js"
import { ConveyorNode, find_edges_and_nodes } from "../src/ConveyorNode"

/**
 * Determines if a graph's numbers make sense.
 *
 * A legal graph is one where every node has either:
 * 1. All ins become outs (standard nodes)
 * 2. No ins, holding 0 and some outs (source nodes)
 * 3. No outs, and holding equals ins (destination nodes)
 * @param root_nodes
 */
export function is_legal_graph(...root_nodes: ConveyorNode[]): boolean {
  // `ConveyorNode.node_type` just counts number of in / out links, not carrying
  const is_standard = (node: ConveyorNode) =>
    node.sum_ins.equals(node.sum_outs) && node.holding.equals(0)
  const is_source = (node: ConveyorNode) =>
    node.ins.length == 0 &&
    (node.holding.equals(0) || node.holding.equals(node.sum_outs.neg()))
  const is_destination = (node: ConveyorNode) =>
    node.outs.length == 0 && node.holding.equals(node.sum_ins)
  let nodes = find_edges_and_nodes(...root_nodes).nodes
  let result = nodes.some(
    (node) => !(is_standard(node) || is_source(node) || is_destination(node)),
  )
  return !result
}

/**
 * Counts the `holding` for each reachable node that has no outs.
 * @param root_nodes
 */
export function get_leaves(...root_nodes: ConveyorNode[]): ConveyorNode[] {
  return find_edges_and_nodes(...root_nodes).nodes.filter(
    (node) => node.outs.length == 0,
  )
}

export function map_decimal(number: number) {
  return new Decimal(number)
}
export function map_to_decimals(numbers: number[]) {
  return numbers.map(map_decimal)
}

export function _map_link(link: {
  src: ConveyorNode
  carrying: Decimal
  dst: ConveyorNode
}) {
  return {
    src: link.src.id,
    carrying: link.carrying,
    dst: link.dst.id,
  }
}

export function to_check_able(nodes: ConveyorNode[]) {
  return new Set(
    nodes.map((node) => {
      return {
        ins: node.ins.map(_map_link),
        holding: node.holding,
        outs: node.outs.map(_map_link),
      }
    }),
  )
}
