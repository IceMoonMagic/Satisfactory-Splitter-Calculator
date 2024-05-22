import { Decimal } from "decimal.js"
import { ConveyorNode, even_split, serialize, ratio, smart_merge, clean_up_graph, findEdgesAndNodes } from "../ConveyorNode"

onmessage = (e) => {
  const into = e.data.into
  const from = e.data.from
  const max_split = e.data.max_split
  const max_merge = e.data.max_merge
  let graph: ConveyorNode[]
  if (e.data.ratio_perms !== true) {
    graph = main(into, from, max_split, max_merge)
  } else {
    graph = main_find_best(into, from, max_split, max_merge)
  }
  
  const keys = serialize(...graph)
  postMessage(keys)
}

function main(
  into: Array<number | Decimal>,
  from: Array<number | Decimal> = undefined,
  max_split: number = 3,
  max_merge: number = 3
): ConveyorNode[] {
  if (into.length === 0) {
    throw new Error('No inputs provided.')
  } else if (
    into.some(i => i instanceof Decimal ? i.lte(0) : i <= 0)
  ) {
    throw new Error('Inputs must be greater than 0')
  }
  
  const targets: Decimal[] = new Array(into.length)
  into.forEach((n, i) => targets[i] = (new Decimal(n)))
  const targets_total = Decimal.sum(...targets)
  
  from = from || [targets_total]
  const sources: Decimal[] = new Array(from.length)
  from.forEach((n, i) => sources[i] = (new Decimal(n)))
  const sources_total = Decimal.sum(...sources)
  
  const ratio_targets = ratio(targets.concat(sources))
  const ratio_sources = ratio_targets.splice(targets.length)
  
  if (!sources_total.eq(targets_total)) {
    throw new Error('total_souces != total_targets')
  }
  
  const root_nodes: ConveyorNode[] = new Array()
  let split_nodes: ConveyorNode[] = new Array()
  for (let i in sources) {
    const root_node = new ConveyorNode(sources[i])
    root_nodes.push(root_node)
    const src_node = new ConveyorNode()
    root_node.link_to(src_node)
    if (ratio_sources[i].eq(1)) {
      split_nodes = split_nodes.concat(src_node)
    } else {
      split_nodes = split_nodes.concat(
        even_split(src_node, ratio_sources[i].toNumber(), max_split)
      )
    }
  } 
  smart_merge(split_nodes, ratio_targets, max_merge)
  // return root_nodes
  clean_up_graph(root_nodes)
  return root_nodes
}

function main_find_best(
  into: Array<number | Decimal>,
  from: Array<number | Decimal> = undefined,
  max_split: number = 3,
  max_merge: number = 3
): ConveyorNode[] {
  function* permutations(elements: any[]) {
    if (elements === undefined) {
      yield undefined
      return
    }
    if (elements.length <= 1) {
      yield elements
      return
    }
    for (let perm of permutations(elements.slice(1))) {
      for (let i in elements) {
        yield perm.slice(0, i)
        .concat(elements.slice(0, 1))
        .concat(perm.slice(i))
      }
    }
  }
  
  let best_start: ConveyorNode[]
  let best_lines: number
  
  for (let into_perm of permutations(into)) {
    for (let from_perm of permutations(from)) {
      const root_nodes = main(into_perm, from_perm, max_split, max_merge)
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



