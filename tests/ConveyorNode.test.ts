import { Fraction } from "fraction.js"
import { describe, expect, test } from "vitest"
import {
  ConveyorNode,
  deserialize,
  even_split,
  split_by_factors,
  find_edges_and_nodes,
  find_loopback_bottlenecks,
  replace_loopback_bottleneck,
  serialize,
  smart_merge,
} from "../src/ConveyorNode"
import { prime_factorization, sum } from "../src/math"
import { get_leaves, is_legal_graph, to_check_able } from "./utils"

describe("ConveyorNode Properties", () => {
  test("sum_ins", () => {
    const target_node = new ConveyorNode()
    for (let value of [32, 16, 8, 4, 2, 1, 0.5, 0.25, 0.125]) {
      let src_node = new ConveyorNode(new Fraction(1).div(value))
      src_node.link_to(target_node)
    }
    expect(target_node.sum_ins).toEqual(new Fraction(15.96875))
  })
  test("sum_outs", () => {
    const source_node = new ConveyorNode(new Fraction(15.96875))
    for (let value of [32, 16, 8, 4, 2, 1, 0.5, 0.25, 0.125]) {
      let dst_node = new ConveyorNode()
      source_node.link_to(dst_node, new Fraction(1).div(value))
    }
    expect(source_node.sum_outs).toEqual(new Fraction(15.96875))
  })
  test("splits_evenly", () => {
    const node = new ConveyorNode()
    node.link_to(new ConveyorNode(), new Fraction(4))
    node.link_to(new ConveyorNode(), new Fraction(4))
    node.link_to(new ConveyorNode(), new Fraction(4))
    expect(node.does_split_evenly).toBeTruthy()
    node.link_to(new ConveyorNode(), new Fraction(8))
    expect(node.does_split_evenly).toBeFalsy()
  })
  test("splittable", () => {
    const node = new ConveyorNode(new Fraction(60))
    expect(node.splittable).toEqual(new Fraction(60))
    node.link_to(new ConveyorNode(), new Fraction(30))
    expect(node.splittable).toEqual(new Fraction(30))
    // Drain holding to 0
    node.link_to(new ConveyorNode(), new Fraction(30))
    expect(node.splittable).toEqual(new Fraction(30))
  })
  test("split_into", () => {
    const node = new ConveyorNode(new Fraction(60))
    expect(node.split_into(4)).toEqual(new Fraction(15))
    node.link_to(new ConveyorNode(), new Fraction(15))
    expect(node.split_into(2)).toEqual(new Fraction(15))
    // Drain holding to 0
    node.link_to(new ConveyorNode(), new Fraction(45))
    expect(node.split_into(4)).toEqual(new Fraction(0))
  })
})

test("Linking", () => {
  const node1 = new ConveyorNode(new Fraction(5))
  const node2 = new ConveyorNode()
  const node3 = new ConveyorNode()
  node1.link_to(node2)
  node1.link_to(node3, node1.holding)
  expect(node1.holding).toEqual(new Fraction(0))
  expect(node2.holding).toEqual(new Fraction(5))
  expect(node3.holding).toEqual(new Fraction(0))

  node1.unlink_to_all()
  expect(node1.outs.length).toBe(0)
  expect(node1.holding).toEqual(new Fraction(5))
  expect(node2.holding).toEqual(new Fraction(0))
  expect(node3.holding).toEqual(new Fraction(0))

  node1.link_to(node2, new Fraction(1))
  node1.link_to(node2, new Fraction(1))
  node1.link_to(node3, new Fraction(1.75))
  expect(node1.holding).toEqual(new Fraction(1.25))
  expect(node2.holding).toEqual(new Fraction(2))
  expect(node3.holding).toEqual(new Fraction(1.75))
})

test("find_edges_and_nodes", () => {
  const nodes = [3, 0, 0, 3, 0, 0, 0].map(
    (n) => new ConveyorNode(new Fraction(n)),
  )
  nodes[0].link_to(nodes[1])
  nodes[1].link_to(nodes[2], new Fraction(4))
  nodes[2].link_to(nodes[1], new Fraction(1))
  nodes[3].link_to(nodes[4])
  nodes[2].link_to(nodes[5], new Fraction(2))
  nodes[4].link_to(nodes[5], new Fraction(1.5))
  nodes[4].link_to(nodes[6])
  const edges: any[] = []
  nodes.forEach((node) => {
    edges.push(...node.outs)
  })

  const result = find_edges_and_nodes(nodes[0], nodes[3])
  nodes.forEach((node) => expect(result.nodes).toContain(node))
  result.nodes.forEach((node) => expect(nodes).toContain(node))
  edges.forEach((edge) => expect(result.edges).toContain(edge))
  result.edges.forEach((edge) => expect(edges).toContain(edge))
})

describe("Loop Bottlenecks", () => {
  describe.each([
    ["Undefined", undefined, 1],
    ["w/ Matches", 5, 1],
    ["w/o Matches", 6, 0],
  ])("Threshold %s", (_id_str, threshold, bottlenecks) => {
    let root_node = new ConveyorNode(new Fraction(5))
    let spacer_node = new ConveyorNode()
    root_node.link_to(spacer_node)
    even_split(spacer_node, 5)
    let bottleneck = root_node.outs[0].dst.outs[0]
    test("Find Bottleneck", () => {
      let result = find_loopback_bottlenecks([root_node], threshold)
      expect(result.length).toBe(bottlenecks)
      if (bottlenecks > 0) expect(result[0]).toBe(bottleneck)
    })
    if (bottlenecks > 0)
      test("Fix Bottleneck", () => {
        replace_loopback_bottleneck(bottleneck)
        expect(is_legal_graph(root_node)).toBeTruthy()
        expect(find_loopback_bottlenecks([root_node]).length).toBe(0)
      })
  })
})

test("Serializing", () => {
  const root_node1 = new ConveyorNode(new Fraction(60)) // Serialize integers
  const root_node2 = new ConveyorNode(new Fraction(1)) // Serialize decimals
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
    [split_by_factors, (v: number) => prime_factorization(new Fraction(v))],
    // [prime_split, (v: number) => new Decimal(v)],
  ])("%o", (fn: Function, transform_amount: Function) =>
    test.each([2, 3, 4, 5, 6, 7, 8, 9, 13, 15, 32, 60])(
      "%i",
      (amount: number) => {
        let root_node = new ConveyorNode(new Fraction(amount))
        let spacer = new ConveyorNode()
        root_node.link_to(spacer)
        fn(spacer, transform_amount(amount))
        expect(is_legal_graph(root_node)).toBeTruthy()
        let leaves = get_leaves(root_node)
        expect(leaves.length).toBe(amount)
        expect(!leaves.some((node) => !node.holding.equals(1))).toBeTruthy()
      },
    ),
  )
})

// test.todo("merge") // Not exported

describe("Smart Merge", () => {
  describe.each([
    [[2], [[1, 1], [2]]],
    [
      [3],
      [
        [1, 1, 1],
        [1, 2],
        [2, 1],
      ],
    ],
    [
      [2, 2],
      [
        [1, 1, 1, 1],
        [1, 1, 2],
        [1, 2, 1],
        [2, 1, 1],
        [2, 2],
        [1, 3],
        [3, 1],
      ],
    ],
    [[2, 3], [[1, 1, 1, 1, 1, 1]]],
  ])("%o => %o", (splits: number[], into: number[][]) => {
    const splits_d = splits.map((n) => new Fraction(n))
    const into_d = into.map((na: number[]) =>
      na.map((n: number) => new Fraction(n)),
    )
    // return
    describe.each([into_d])("Into", (_into: Fraction[]) => {
      test.each([2, 3, 4, 5, 7])("Merge %d", (max_merge: number) => {
        let root_node = new ConveyorNode(sum(..._into))
        let spacer_node = new ConveyorNode()
        root_node.link_to(spacer_node)
        let split_nodes = split_by_factors(spacer_node, splits_d)
        let end_nodes = smart_merge(split_nodes, _into, max_merge)
        expect(is_legal_graph(root_node)).toBeTruthy()
        expect(to_check_able(get_leaves(root_node))).toEqual(
          to_check_able(end_nodes),
        )
        expect(
          new Set(get_leaves(root_node).map((node) => node.holding)),
        ).toEqual(new Set(_into))
      })
    })
  })
})
