import { Decimal } from "decimal.js"
import { describe, expect, test } from "vitest"
import {
  main,
  main_split,
  factorized_split,
  basic_factorized_split_finisher,
  step1,
  step0,
  step2,
} from "../src/calculate"
import {
  ConveyorNode,
  smart_merge,
  split_by_factors,
} from "../src/ConveyorNode"
import {
  get_leaves,
  is_legal_graph,
  map_to_decimals,
  to_check_able,
} from "./utils"

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
  describe("Step 0", () => {
    test.each([
      [[60], [30, 15, 15], [4], [2, 1, 1]],
      [
        [2, 1],
        [0.5, 0.5, 0.5, 0.5, 0.5, 0.25, 0.25],
        [8, 4],
        [2, 2, 2, 2, 2, 1, 1],
      ],
      [
        [0.5, 0.5],
        [0.75, 0.25],
        [2, 2],
        [3, 1],
      ],
    ])(
      "%o, %o -> %o, %o",
      (
        arg_targets: number[],
        arg_sources: number[],
        expected_targets: number[],
        expected_sources: number[],
      ) => {
        const { targets: actual_targets, sources: actual_sources } = step0(
          map_to_decimals(arg_targets),
          map_to_decimals(arg_sources),
        )
        expect(actual_targets.length).toEqual(arg_targets.length)
        expect(actual_targets).toEqual(map_to_decimals(expected_targets))

        expect(actual_sources.length).toBe(
          arg_sources != undefined ? arg_sources.length : 1,
        )
        expect(actual_sources).toEqual(map_to_decimals(expected_sources))
      },
    )
  })
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
  describe("Step 2", () => {
    // Copied from ConveyorNode.test for Splitting
    test.each([2, 3, 4, 5, 6, 7, 8, 9, 13, 15, 32, 60])(
      "%i",
      (amount: number) => {
        let root_node = new ConveyorNode(new Decimal(amount))
        let spacer = new ConveyorNode()
        root_node.link_to(spacer)
        const result = step2([spacer], [new Decimal(amount)])
        expect(is_legal_graph(root_node)).toBeTruthy()
        const starved_sum = Decimal.sum(
          ...result.starved_mergers.map((node) => node.holding),
          0,
        ).toNumber()
        let leaves = get_leaves(root_node)
        expect(to_check_able(result.leaf_nodes)).toEqual(to_check_able(leaves))
        expect(starved_sum).toBeLessThanOrEqual(0)
        expect(result.leaf_nodes.length + starved_sum).toBe(amount)
        expect(!leaves.some((node) => !node.holding.equals(1))).toBeTruthy()
      },
    )
  })
  describe("Step 3", () => {
    // Copied from ConveyorNode.test for smart_merge
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
      const splits_d = splits.map((n) => new Decimal(n))
      const into_d = into.map((na: number[]) =>
        na.map((n: number) => new Decimal(n)),
      )
      // return
      describe.each([into_d])("Into", (_into: Decimal[]) => {
        test.each([2, 3, 4, 5, 7])("Merge %d", (max_merge: number) => {
          let root_node = new ConveyorNode(Decimal.sum(..._into))
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
  // describe.todo("Step 4") // Deferring to ConveyorNode.test Loop Bottlenecks tests
  // describe.todo("Step 5") // ToDo: Defer to ConveyorNode.test Clean Up Graph
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
