import { Decimal } from "decimal.js"
import {
  countMultisetPermutations,
  multisetPermutations,
  ratio,
} from "../math.ts"
import {
  ConveyorNode,
  even_split,
  serialize,
  smart_merge,
  clean_up_graph,
  findEdgesAndNodes,
  findLoopBackBottlenecks,
  replaceLoopBottleneck,
} from "../ConveyorNode"

onmessage = (e) => {
  const into: Decimal[] = e.data.into.map((v: number) => new Decimal(v))
  const from: Decimal[] = e.data.from.map((v: number) => new Decimal(v))
  const max_split: number = e.data.max_split
  const max_merge: number = e.data.max_merge
  const bottleneck_threshold: number = e.data.bottleneck_threshold
  let graph: ConveyorNode[]
  if (e.data.ratio_perms !== true) {
    graph = main(into, from, max_split, max_merge, bottleneck_threshold)
  } else {
    graph = main_find_best(
      into,
      from,
      max_split,
      max_merge,
      bottleneck_threshold,
    )
  }

  const keys = serialize(...graph)
  postMessage(keys)
}

/**
 * Find how to split / merge `from` into `into`
 * @param into - List of Targets
 * @param from - List of Source
 * @param max_split - Maximum number of belts that a single splitter can split into
 * @param max_merge - Maximum number of belts that a single merger can merge from
 * @param bottleneck_threshold - Threshold to use alternate loop-back belt layout
 */
function main(
  into: Decimal[],
  from: Decimal[] = undefined,
  max_split: number = 3,
  max_merge: number = 3,
  bottleneck_threshold?: number | Decimal,
): ConveyorNode[] {
  if (into.length === 0) {
    throw new Error("No inputs provided.")
  } else if (into.some((i) => (i instanceof Decimal ? i.lte(0) : i <= 0))) {
    throw new Error("Inputs must be greater than 0")
  }

  const targets: Decimal[] = into
  const targets_total = Decimal.sum(...targets)

  const sources: Decimal[] = from || [targets_total]
  const sources_total = Decimal.sum(...sources)

  if (!sources_total.eq(targets_total)) {
    throw new Error("total_sources != total_targets")
  }

  const ratio_targets = ratio(targets.concat(sources))
  const ratio_sources = ratio_targets.splice(targets.length)

  const root_nodes: ConveyorNode[] = []
  let split_nodes: ConveyorNode[] = []
  for (let i in sources) {
    const root_node = new ConveyorNode(sources[i])
    root_nodes.push(root_node)
    const src_node = new ConveyorNode()
    root_node.link_to(src_node)
    if (ratio_sources[i].eq(1)) {
      split_nodes = split_nodes.concat(src_node)
    } else {
      split_nodes = split_nodes.concat(
        even_split(src_node, ratio_sources[i].toNumber(), max_split),
      )
    }
  }
  if (bottleneck_threshold != undefined) {
    findLoopBackBottlenecks(root_nodes, bottleneck_threshold).forEach((edge) =>
      replaceLoopBottleneck(edge),
    )
  }
  smart_merge(split_nodes, ratio_targets, max_merge)
  // return root_nodes
  clean_up_graph(root_nodes)
  return root_nodes
}

/**
 * Solve every permutation of `into` and `from` and returns the best
 * @param into - List of Targets
 * @param from - List of Source
 * @param max_split - Maximum number of belts that a single splitter can split into
 * @param max_merge - Maximum number of belts that a single merger can merge from
 * @param bottleneck_threshold - Threshold to use alternate loop-back belt layout
 */
function main_find_best(
  into: Decimal[],
  from: Decimal[] = undefined,
  max_split: number = 3,
  max_merge: number = 3,
  bottleneck_threshold?: number | Decimal,
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
      const edgesAndNodes = findEdgesAndNodes(...root_nodes)
      const lines = edgesAndNodes.edges.length + edgesAndNodes.nodes.length
      if (best_lines === undefined || lines < best_lines) {
        best_lines = lines
        best_start = root_nodes
      }
    }
  }
  return best_start
}
