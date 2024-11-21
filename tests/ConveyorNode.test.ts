import { Decimal } from "decimal.js"
import {
  ConveyorNode,
  deserialize,
  even_split,
  factor_split,
  find_edges_and_nodes,
  prime_split,
  serialize,
} from "../src/ConveyorNode"
import { assert, describe, expect, test } from "vitest"
import { prime_factorization } from "../src/math"

/**
 * Determines if a graph's numbers make sense.
 *
 * A legal graph is one where every node has either:
 * 1. All ins become outs (standard nodes)
 * 2. No ins, holding 0 and some outs (source nodes)
 * 3. No outs, and holding equals ins (destination nodes)
 * @param root_nodes
 */
function is_legal_graph(...root_nodes: ConveyorNode[]): boolean {
  // `ConveyorNode.node_type` just counts number of in / out links, not carrying
  const is_standard = (node: ConveyorNode) =>
    node.sum_ins.equals(node.sum_outs) && node.holding.equals(0)
  const is_source = (node: ConveyorNode) =>
    node.ins.length == 0 && node.holding.equals(node.sum_outs)
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
function get_leaves(...root_nodes: ConveyorNode[]): ConveyorNode[] {
  return find_edges_and_nodes(...root_nodes).nodes.filter(
    (node) => node.outs.length == 0,
  )
}

function to_check_able(nodes: ConveyorNode[]) {
  function _map_link(link: {
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

describe("ConveyorNode Properties")

test("Linking", () => {
  const node1 = new ConveyorNode(new Decimal(5))
  const node2 = new ConveyorNode()
  const node3 = new ConveyorNode()
  node1.link_to(node2)
  node1.link_to(node3, node1.holding)
  expect(node1.holding).toEqual(new Decimal(0))
  expect(node2.holding).toEqual(new Decimal(5))
  expect(node3.holding).toEqual(new Decimal(0))

  node1.unlink_to_all()
  expect(node1.holding).toEqual(new Decimal(5))
  expect(node2.holding).toEqual(new Decimal(0))
  expect(node3.holding).toEqual(new Decimal(0))

  node1.link_to(node2, new Decimal(1))
  node1.link_to(node2, new Decimal(1))
  node1.link_to(node3, new Decimal(1.75))
  expect(node1.holding).toEqual(new Decimal(1.25))
  expect(node2.holding).toEqual(new Decimal(2))
  expect(node3.holding).toEqual(new Decimal(1.75))
})

test("find_edges_and_nodes", () => {
  const nodes = [3, 0, 0, 3, 0, 0, 0].map(
    (n) => new ConveyorNode(new Decimal(n)),
  )
  nodes[0].link_to(nodes[1])
  nodes[1].link_to(nodes[2], new Decimal(4))
  nodes[2].link_to(nodes[1], new Decimal(1))
  nodes[3].link_to(nodes[4])
  nodes[2].link_to(nodes[5], new Decimal(2))
  nodes[4].link_to(nodes[5], new Decimal(1.5))
  nodes[4].link_to(nodes[6])
  const edges = []
  nodes.forEach((node) => {
    edges.push(...node.outs)
  })

  const result = find_edges_and_nodes(nodes[0], nodes[3])
  nodes.forEach((node) => expect(result.nodes).toContain(node))
  result.nodes.forEach((node) => expect(nodes).toContain(node))
  edges.forEach((edge) => expect(result.edges).toContain(edge))
  result.edges.forEach((edge) => expect(edges).toContain(edge))
})

describe("Loop Bottlenecks")

test("Serializing", () => {
  const root_node1 = new ConveyorNode(new Decimal(60)) // Serialize integers
  const root_node2 = new ConveyorNode(new Decimal(1)) // Serialize decimals
  even_split(root_node1, 60)
  even_split(root_node2, 60)
  const orig = find_edges_and_nodes(root_node1, root_node2)
  const check = find_edges_and_nodes(
    ...deserialize(serialize(root_node1, root_node2)),
  )
  expect(to_check_able(check.nodes)).toEqual(to_check_able(orig.nodes))
})

describe("Splitting", () => {
  describe.each([
    [even_split, (v: number) => v],
    [factor_split, (v: number) => prime_factorization(new Decimal(v))],
    [prime_split, (v: number) => new Decimal(v)],
  ])("%o", (fn: Function, transform_amount: Function) =>
    test.each([2, 3, 4, 5, 6, 7, 8, 9, 13, 15, 32, 60])(
      "%i",
      (amount: number) => {
        let root_node = new ConveyorNode(new Decimal(amount))
        fn(root_node, transform_amount(amount))
        expect(is_legal_graph(root_node)).toBeTruthy
        let leaves = get_leaves(root_node)
        expect(leaves.length == amount).toBeTruthy
        expect(!leaves.some((node) => !node.holding.equals(1))).toBeTruthy
      },
    ),
  )
})
describe("Merging")
