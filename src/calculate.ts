import Decimal from "decimal.js"
import {
  clean_up_graph,
  ConveyorNode,
  even_split,
  find_edges_and_nodes,
  find_loopback_bottlenecks,
  replace_loopback_bottleneck,
  smart_merge,
  split_by_factors,
} from "./ConveyorNode"
import {
  countMultisetPermutations,
  find_next_multiple,
  multisetPermutations,
  prime_factorization,
  ratio,
} from "./math"

interface LeafsAndMergers {
  leaf_nodes: ConveyorNode[]
  starved_mergers: ConveyorNode[]
}

/**
 * Step 0 - Simplify Inputs
 *
 * Ratio sources and targets such that
 * they are all integers and the smallest unit is 1.
 *
 * E.g. [[60], [30, 15, 15]] -> [[4], [2, 1, 1]]
 * or [[2, 1], [0.5, 0.5, 0.5, 0.5, 0.5, 0.25, 0.25]] -> [[8, 4],  [2, 2, 2, 2, 2, 1, 1]]
 * or [[0.5, 0.5], [0.75, 0.25]] -> [[2, 2], [3, 1]]
 *
 * sum(targets) must equal sum(sources)
 *
 * @param targets
 * @param sources - Defaults to [<sum of targets>]
 * @returns Ratio-ed `targets` and `sources`
 *
 * @see ratio
 */
export function step0(
  targets: Decimal[],
  sources?: Decimal[],
): { sources: Decimal[]; targets: Decimal[] } {
  const targets_total = Decimal.sum(...targets)

  sources = sources ?? [targets_total]
  const sources_total = Decimal.sum(...sources)

  if (!sources_total.eq(targets_total)) {
    throw new Error("total_sources != total_targets")
  }

  const ratio_targets = ratio(targets.concat(sources))
  const ratio_sources = ratio_targets.splice(targets.length)
  return { sources: ratio_sources, targets: ratio_targets }
}

/**
 * Step 1 - Init Graph
 *
 * Create a root node for each `raw_source`.
 */
export function step1(raw_sources: Decimal[]): ConveyorNode[] {
  const root_nodes: ConveyorNode[] = []
  for (let holding of raw_sources) {
    root_nodes.push(new ConveyorNode(holding))
  }
  return root_nodes
}

/**
 * Step 2 - Split Roots
 *
 * Split each `root_node` into `count` equal parts.
 * @param root_nodes
 * @param counts
 * @param max_split – Maximum number of belts that a single splitter can split into
 * @param smaller_splits_first - Split bigger factors first
 * @param merge_level – Lowest depth to apply mergers. Undefined to ignore
 * @see even_split
 * @see factorized_split
 */
export function step2(
  root_nodes: ConveyorNode[],
  counts: Decimal[],
  max_split?: number,
  smaller_splits_first?: boolean,
  merge_level?: number,
): LeafsAndMergers {
  if (root_nodes.length != counts.length)
    throw new Error(
      `lengths of root_nodes and counts don't equal, 
      ${root_nodes.length} != ${counts.length}`,
    )

  const leaf_nodes: ConveyorNode[] = []
  const starved_mergers: ConveyorNode[] = []
  for (let i = 0; i < counts.length; i++) {
    const count = counts[i]
    const root_node = root_nodes[i]
    const spacer_node = new ConveyorNode()
    root_node.link_to(spacer_node)
    if (count.equals(1)) {
      leaf_nodes.push(spacer_node)
      continue
    }
    //* [Toggle]
    leaf_nodes.push(...even_split(spacer_node, count.toNumber(), max_split))
    /*/
    const result = factorized_split(
      spacer_node,
      count,
      !smaller_splits_first,
      max_split,
      merge_level,
    )
    leaf_nodes.push(...result.leaf_nodes)
    starved_mergers.push(...result.starved_mergers)
    //*/
  }
  return { leaf_nodes, starved_mergers }
}

/**
 * Step 3 - Combine Nodes
 *
 * @param leaf_nodes - Nodes eligible for merging
 * @param targets
 * @param max_merge - Maximum number of belts that a single splitter can split into
 * @param starved_mergers - Mergers still needing some inputs
 */
export function step3(
  leaf_nodes: ConveyorNode[],
  targets: Decimal[],
  max_merge?: number,
  starved_mergers?: ConveyorNode[],
): ConveyorNode[] {
  if (starved_mergers != undefined)
    // Idea is to eventually consider which leaves to group for targets
    // and which to send back to mergers, all in one step.
    leaf_nodes = basic_factorized_split_finisher(starved_mergers, leaf_nodes)
  return smart_merge(leaf_nodes, targets, max_merge)
}

/**
 * Step 4 - Remove Bottlenecks
 *
 * @param threshold - Threshold to detect bottlenecks. `null` skips, `undefined` == auto.
 * @param root_nodes - Roots of graph to work on
 *
 * @see find_loopback_bottlenecks
 * @see replace_loopback_bottleneck
 */
export function step4(
  threshold?: Decimal,
  ...root_nodes: ConveyorNode[]
): void {
  if (threshold === null) return
  const bottlenecks = find_loopback_bottlenecks(root_nodes, threshold)
  for (const bottleneck of bottlenecks) {
    replace_loopback_bottleneck(bottleneck)
  }
}

/**
 * Step 5 - Polish Graph
 *
 * @param root_nodes - Roots of graph to work on
 * @see clean_up_graph
 */
export function step5(...root_nodes: ConveyorNode[]): void {
  clean_up_graph(root_nodes)
}

/**
 * Creates a graph splitting each of `into` into `into[i]` even parts
 * @param into - Targets
 * @param max_split - Maximum number of belts that a single splitter can split into
 * @param bottleneck_threshold - Highest allowed items / minute on an edge
 *
 * @see step1
 * @see step2
 * @see step4
 * @see step5
 */
export function main_split(
  into: Decimal[],
  max_split?: number,
  bottleneck_threshold?: Decimal,
): ConveyorNode[] {
  const root_nodes = step1(into)
  const { leaf_nodes, starved_mergers } = step2(
    root_nodes,
    into,
    max_split,
    undefined,
    undefined,
  )
  if (starved_mergers.length > 0)
    basic_factorized_split_finisher(starved_mergers, leaf_nodes)

  step4(bottleneck_threshold, ...root_nodes)
  step5(...root_nodes)
  return root_nodes
}

/**
 * Find how to split / merge `from` into `into`
 * @param into - List of Targets
 * @param from - List of Source
 * @param max_split - Maximum number of belts that a single splitter can split into
 * @param max_merge - Maximum number of belts that a single merger can merge from
 * @param bottleneck_threshold - Threshold to use alternate loop-back belt layout
 *
 * @see step1
 * @see step2
 * @see step4
 * @see step5
 */
export function main(
  into: Decimal[],
  from?: Decimal[],
  max_split?: number,
  max_merge?: number,
  bottleneck_threshold?: Decimal,
): ConveyorNode[] {
  const { sources, targets } = step0(into, from)
  const root_nodes = step1(from)
  const { leaf_nodes, starved_mergers } = step2(
    root_nodes,
    sources,
    max_split,
    undefined,
    undefined,
  )
  step3(leaf_nodes, targets, max_merge, starved_mergers)
  step4(bottleneck_threshold, ...root_nodes)
  step5(...root_nodes)
  return root_nodes
}

/**
 * Solve every permutation of `into` and `from` and returns the best
 * @param into - List of Targets
 * @param from - List of Source
 * @param max_split - Maximum number of belts that a single splitter can split into
 * @param max_merge - Maximum number of belts that a single merger can merge from
 * @param bottleneck_threshold - Threshold to use alternate loop-back belt layout
 *
 * @see main
 */
export function main_find_best(
  into: Decimal[],
  from?: Decimal[],
  max_split?: number,
  max_merge?: number,
  bottleneck_threshold?: Decimal,
): ConveyorNode[] {
  const num_perms = countMultisetPermutations(into).mul(
    countMultisetPermutations(from),
  )

  /** Root nodes of best graph */
  let best_start: ConveyorNode[]
  /** Sum of number of nodes and number of edges on best graph*/
  let best_lines: number = undefined
  let counter = 1

  for (let into_perm of multisetPermutations(into)) {
    for (let from_perm of multisetPermutations(from)) {
      postMessage(`(${counter++}/${num_perms})`)
      const root_nodes = main(
        into_perm,
        from_perm,
        max_split,
        max_merge,
        bottleneck_threshold,
      )
      const edges_and_nodes = find_edges_and_nodes(...root_nodes)
      const lines = edges_and_nodes.edges.length + edges_and_nodes.nodes.length
      if (best_lines === undefined || lines < best_lines) {
        best_lines = lines
        best_start = root_nodes
      }
    }
  }
  return best_start
}

/**
 * Splits `root_node` into `out_amount` nodes
 * @param root_node
 * @param out_amount
 * @param smaller_first - Split smaller factors first
 * @param max_split - Maximum number of belts that a single splitter can split into
 * @param merge_level - Lowest depth to apply mergers. Negative to ignore
 * @returns Resulting leaf nodes
 *
 * @see basic_factorized_split_finisher
 */
export function factorized_split(
  root_node: ConveyorNode,
  out_amount: Decimal,
  smaller_first?: boolean,
  max_split: number = 3,
  merge_level?: number,
): LeafsAndMergers {
  if (out_amount.lessThanOrEqualTo(max_split)) {
    return {
      leaf_nodes: split_by_factors(root_node, [out_amount]),
      starved_mergers: [],
    }
  }

  const splittable = find_next_multiple(root_node.holding, max_split)
  const splittable_factors = prime_factorization(splittable, smaller_first)
  const total_loops = splittable.minus(out_amount)

  if (total_loops.equals(0))
    return {
      leaf_nodes: split_by_factors(root_node, splittable_factors),
      starved_mergers: [],
    }

  const merger_inputs: ConveyorNode[] = []

  function _factorized_split(
    loops_: Decimal,
    curr_node: ConveyorNode,
    splits: Decimal[],
    level: number,
  ) {
    const loops_factors = prime_factorization(loops_)

    if (
      (merge_level != undefined && merge_level >= 0 && merge_level <= level) ||
      !loops_factors.some((factor) => factor.equals(splits[0]))
    ) {
      // ToDo: Avoid bottleneck
      const merger_in = new ConveyorNode()
      merger_in.link_to(curr_node, loops_)
      merger_inputs.push(merger_in)
      const spacer = new ConveyorNode()
      curr_node.link_to(spacer)
      return split_by_factors(spacer, splits)
    }

    const factor = loops_factors.find((factor) => factor.equals(splits[0]))
    return split_by_factors(curr_node, [factor]).reduce<ConveyorNode[]>(
      (result, leaf) =>
        result.concat(
          _factorized_split(
            loops_.dividedBy(factor),
            leaf,
            splits.slice(1),
            level + 1,
          ),
        ),
      [],
    )
  }
  return {
    leaf_nodes: _factorized_split(
      total_loops,
      root_node,
      splittable_factors,
      0,
    ),
    starved_mergers: merger_inputs,
  }
}

/**
 * Finisher for `factorized_split`.
 * Collects children until the mergers' deficit can be filled.
 * This basically mimics how `even_split` does it.
 * @param starved_mergers - Mergers to finish
 * @param leaf_nodes - Leaf nodes to take from
 * @returns Remaining leaf nodes
 *
 * @see factorized_split
 * @see even_split
 */
export function basic_factorized_split_finisher(
  starved_mergers: ConveyorNode[],
  leaf_nodes: ConveyorNode[],
) {
  function _basic_finisher(
    curr_node: ConveyorNode,
    merger: ConveyorNode,
    need: Decimal,
  ): ConveyorNode[] {
    if (need.equals(0)) return []
    if (curr_node.outs.length == 0) return [curr_node]
    const merge = []
    for (
      let out = 0;
      out < curr_node.outs.length && need.greaterThanOrEqualTo(merge.length);
      out++
    ) {
      merge.push(
        ..._basic_finisher(
          curr_node.outs[out].dst,
          merger,
          need.minus(merge.length),
        ),
      )
    }
    return merge
  }
  for (let mt of starved_mergers) {
    const target = mt.holding.negated()
    const merger = mt.outs[0].dst
    const merge_nodes = _basic_finisher(merger.outs[0].dst, merger, target)
    merge_nodes.forEach((node) =>
      leaf_nodes.splice(leaf_nodes.indexOf(node), 1),
    )
    const merged = smart_merge(merge_nodes, [target])[0]
    mt.outs[0].remove_link()
    merged.link_to(merger)
  }
  return leaf_nodes
}
