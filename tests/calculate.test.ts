import { Decimal } from "decimal.js"
import { describe, expect, test } from "vitest"
import {
  main,
  main_split,
  factorized_split,
  basic_factorized_split_finisher,
  step1,
} from "../src/calculate"
import { ConveyorNode } from "../src/ConveyorNode"
import { get_leaves, is_legal_graph, map_to_decimals } from "./utils"

/* Sanity Check
  `Set(Decimal[])` won't remove duplicate decimals
  as they are "different" according to TS/JS
*/
test("Decimal Sets", () => {
  expect([1, 1, 1]).not.toEqual([1, 1])
  // prettier-ignore
  expect(new Set([1, 1, 1]))
  .toEqual(new Set([1, 1]))
  //prettier-ignore
  expect(new Set(map_to_decimals([1, 1, 1])))
  .toEqual(new Set(map_to_decimals([1, 1, 1])))
  // prettier-ignore
  expect(new Set(map_to_decimals([1, 1, 1])))
  .not.toEqual(new Set(map_to_decimals([1, 1])))
})

describe("Steps", () => {
  describe.todo("Step 0")
  describe("Step 1", () => {
    test.each([
      [[60, 30, 30]],
      [[2, 4, 8, 16]],
      [[1, 0.5, 0.25, 0.125, 0.0625]],
    ])("%o", (sources: number[] | Decimal[]) => {
      sources = sources.map((n: number | Decimal) => new Decimal(n))
      const root_nodes = step1(sources)
      expect(root_nodes.length).toBe(sources.length)
      expect(root_nodes.some((node) => node.ins.length != 0)).toBeFalsy()
      expect(root_nodes.some((node) => node.outs.length != 0)).toBeFalsy()
      root_nodes.forEach((node, i) => expect(node.holding).toEqual(sources[i]))
    })
  })
  describe.todo("Step 2")
  describe.todo("Step 3")
  describe.todo("Step 4")
  describe.todo("Step 5")
})

describe("Ratio", () => {
  // prettier-ignore
  test.each([
    [[60], [30, 15, 15]],
    [[525, 525, 525, 525],[1050, 1050]], // Issue #8
  ])("%o => %o", (sources: number[], targets: number[]) => {
    const _sources = sources.map((n) => new Decimal(n))
    const _targets = targets.map((n) => new Decimal(n))
    const root_nodes = main(_targets, _sources, 3, 3, undefined)
    const leaf_nodes = get_leaves(...root_nodes)

    expect(is_legal_graph(...root_nodes)).toBeTruthy()

    // prettier-ignore
    expect(new Set(root_nodes.map((node) => node.sum_outs)))
    .toEqual(new Set(_sources))
    // prettier-ignore
    expect(new Set(leaf_nodes.map((node) => node.holding)))
    .toEqual(new Set(_targets))
  })
})

describe("Even Split", () => {
  // prettier-ignore
  test.each([
    [[30, 15, 15]],
    [[1050, 1050]],
  ])("%o", (targets: number[]) => {
    const _targets = targets.map((n) => new Decimal(n))
    const root_nodes = main_split(_targets, 3, undefined)
    const leaf_nodes = get_leaves(...root_nodes)

    expect(is_legal_graph(...root_nodes)).toBeTruthy()

    // prettier-ignore
    expect(new Set(root_nodes.map((node) => node.sum_outs)))
    .toEqual(new Set(_targets))
    expect(leaf_nodes.length).toBe(Decimal.sum(...targets).toNumber())
    expect(leaf_nodes.some((node) => !node.holding.equals(1))).toBeFalsy()
  })
})

describe("Factorized Split", () => {
  test.each([2 ** 6, 2 ** 8, 3 ** 4, 3 ** 5, 60, 120, 480, 780, 1200])(
    "%d",
    (target: number) => {
      const _target = new Decimal(target)
      const root_node = new ConveyorNode(_target)
      const { leaf_nodes: leaf_nodes, starved_mergers } = factorized_split(
        root_node,
        _target,
      )

      expect(is_legal_graph(root_node, ...starved_mergers)).toBeTruthy()

      expect(
        Decimal.sum(
          leaf_nodes.length,
          ...starved_mergers.map((node) => node.holding),
        ),
      ).toEqual(_target)
      expect(leaf_nodes.length).toBe(get_leaves(root_node).length)
      expect(leaf_nodes.some((node) => !node.holding.equals(1))).toBeFalsy()
    },
  )
})

describe("Simple Prime Split Finisher", () => {
  test.each([2 ** 6, 2 ** 8, 3 ** 4, 3 ** 5, 60, 120, 480, 780, 1200])(
    "%d",
    (target: number) => {
      const _target = new Decimal(target)
      const root_node = new ConveyorNode(_target)
      const { leaf_nodes: _leaf_nodes, starved_mergers } = factorized_split(
        root_node,
        _target,
      )

      basic_factorized_split_finisher(starved_mergers, _leaf_nodes)

      expect(is_legal_graph(root_node)).toBeTruthy()

      const leaf_nodes = get_leaves(root_node)

      expect(leaf_nodes.length).toEqual(target)
      expect(leaf_nodes.length).toBe(get_leaves(root_node).length)
      expect(leaf_nodes.some((node) => !node.holding.equals(1))).toBeFalsy()
    },
  )
})
