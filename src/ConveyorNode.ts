import { Decimal } from "decimal.js"

class ConveyorLink {
  public readonly src: ConveyorNode
  public readonly dst: ConveyorNode
  public readonly carrying: Decimal

  constructor(src: ConveyorNode, dst: ConveyorNode, carrying?: Decimal) {
    if (carrying == undefined) {
      carrying = src.splittable
    }

    this.src = src
    this.dst = dst
    this.carrying = carrying

    src.holding = src.holding.minus(carrying)
    dst.holding = dst.holding.plus(carrying)
    src.outs.push(this)
    dst.ins.push(this)
  }

  public remove_link(): void {
    this.src.holding = this.src.holding.plus(this.carrying)
    this.dst.holding = this.dst.holding.minus(this.carrying)
    this.src.outs.splice(this.src.outs.indexOf(this), 1)
    this.dst.ins.splice(this.dst.ins.indexOf(this), 1)
  }
}

export enum NodeTypes {
  Island = "0,0",
  Source = "0,1",
  Source_Splitter = "0,2",
  Destination = "1,0",
  Pass_Through = "1,1",
  Splitter = "1,2",
  Merger_Destination = "2,0",
  Merger = "2,1",
  Merge_Splitter = "2,2",
}

export class ConveyorNode {
  holding: Decimal
  ins: ConveyorLink[]
  outs: ConveyorLink[]

  private static _ids: WeakMap<ConveyorNode, number> = new WeakMap()
  private static _curr_id: number = 0

  constructor(holding: Decimal = new Decimal(0)) {
    this.holding = holding
    this.ins = []
    this.outs = []
  }

  public link_to(dst: ConveyorNode, carrying?: Decimal) {
    new ConveyorLink(this, dst, carrying)
  }

  public unlink_to(dst: ConveyorNode, carrying?: Decimal) {
    this.outs
      .filter((link) => link.dst === dst && link.carrying === carrying)
      .forEach((link) => link.remove_link())
  }

  public unlink_to_all() {
    Array.from(this.outs).forEach((link) => link.remove_link())
  }

  public unlink_from_all() {
    Array.from(this.ins).forEach((link) => link.remove_link())
  }

  get sum_ins(): Decimal {
    return Decimal.sum(...this.ins.map((link) => link.carrying), 0)
  }

  get sum_outs(): Decimal {
    return Decimal.sum(...this.outs.map((link) => link.carrying), 0)
  }

  /** If all out links are carrying the same amount */
  get does_split_evenly(): boolean {
    let target: Decimal = this.sum_outs.dividedBy(this.outs.length)
    return !this.outs.some((link) => !link.carrying.equals(target))
  }

  /**
   * Returns a carrying amount that would keep `does_split_evenly` true
   * OR `this.holding` if no existing out links.
   */
  get splittable(): Decimal {
    return this.outs.length > 0 ? this.outs[0].carrying : this.holding
  }

  /**
   * Returns `this.holding / r`
   * unless `this.holding == 0`
   * or an out link exists.
   */
  public split_into(r: Decimal | number): Decimal {
    if (this.holding.equals(0)) {
      return this.holding
    } else if (this.outs.length > 0) {
      return this.splittable
    }
    return this.holding.dividedBy(r)
  }

  get id(): number {
    let id = ConveyorNode._ids.get(this)
    if (id === undefined) {
      id = ConveyorNode._curr_id++
      ConveyorNode._ids.set(this, id)
    }
    return id
  }

  set id(id: number) {
    ConveyorNode._ids.set(this, id)
  }

  get node_type(): string {
    return [
      Math.min(this.ins.length, 2),
      Math.min(this.outs.length, 2),
    ].toString()
  }
}

export function find_edges_and_nodes(...root_nodes: ConveyorNode[]) {
  const edges: ConveyorLink[] = []
  const nodes: ConveyorNode[] = []
  function _find_edges_and_nodes(currNode: ConveyorNode) {
    if (nodes.indexOf(currNode) === -1) {
      nodes.push(currNode)
      currNode.outs.forEach((link) => edges.push(link))
      currNode.outs.forEach((link) => _find_edges_and_nodes(link.dst))
    }
  }
  root_nodes.forEach((node) => _find_edges_and_nodes(node))
  return { edges: edges, nodes: nodes }
}

/**
 * Find all edges that *could* be a bottleneck (based on carrying vs belt speeds).
 * Only use on split graphs, do not merge multiple roots!
 * This *should* only occur on loopback nodes.
 *
 * If threshold is provided, assumes all sources and targets are within that threshold.
 * Otherwise, assumes all of a root's children are smaller than it (excluding loopbacks).
 * @param root_nodes Nodes at the top of graphs to traverse
 * @param threshold Maximum allowable `link.carrying`
 * @returns
 */
export function find_loopback_bottlenecks(
  root_nodes: ConveyorNode[],
  threshold?: number | Decimal,
): ConveyorLink[] {
  const bottlenecks: ConveyorLink[] = []
  const seen_nodes: ConveyorNode[] = []
  function _find_bottlenecks(
    curr_node: ConveyorNode,
    threshold_: number | Decimal,
  ) {
    if (!seen_nodes.includes(curr_node)) {
      seen_nodes.push(curr_node)
      curr_node.outs.forEach((link) => {
        if (link.carrying.gt(threshold_)) bottlenecks.push(link)
      })
      curr_node.outs.forEach((link) => _find_bottlenecks(link.dst, threshold_))
    }
  }
  root_nodes.forEach((node) =>
    _find_bottlenecks(node, threshold ?? node.sum_outs),
  )
  return bottlenecks
}

/**
 * Replaces a simple bottlenecking loopback with a more complex non-bottlenecking one.
 *
 * Assumes the specific layout of `src -> merge; loop -> merge; merge -(replaceLink)-> split; split -> (N children)`
 *
 * See https://satisfactory.wiki.gg/wiki/Balancer#/media/File:Balancer_odd.png
 * @param replaceLink Link between loopback merger and next splitter
 */
export function replace_loopback_bottleneck(replaceLink: ConveyorLink): void {
  const orig_merger = replaceLink.src
  const main_splitter = replaceLink.dst

  // Make main path bypass original merger
  const main_src_out = orig_merger.ins[0]
  const main_src = main_src_out.src
  main_src_out.remove_link()
  orig_merger.outs[0].remove_link()
  main_src.link_to(main_splitter, main_src_out.carrying)

  // Prep for new intermediate mergers
  const main_children = main_splitter.outs.map((link) => link.dst)
  main_splitter.unlink_to_all()

  // Merge appropriate main and loop for each child
  const each_main_carry = main_splitter.split_into(main_children.length)
  const each_loop_carry = orig_merger.split_into(main_children.length)
  main_children.forEach((child) => {
    const merger = new ConveyorNode()
    main_splitter.link_to(merger, each_main_carry)
    orig_merger.link_to(merger, each_loop_carry)
    merger.link_to(child)
  })
}

export interface SerializedGraph {
  edges: { src: number; dst: number; carrying: string }[]
  nodes: Map<number, string>
}

export function serialize(...root_nodes: ConveyorNode[]): SerializedGraph {
  const { edges: edges, nodes: nodes } = find_edges_and_nodes(...root_nodes)
  return {
    edges: edges.map((edge) => {
      return {
        src: edge.src.id,
        dst: edge.dst.id,
        carrying: edge.carrying.toJSON(),
      }
    }),
    nodes: new Map(
      nodes.map((node) => [
        node.id,
        node.holding.minus(node.sum_ins).add(node.sum_outs).toJSON(),
      ]),
    ),
  }
}

export function deserialize(graph: SerializedGraph): ConveyorNode[] {
  const nodes: Map<number, ConveyorNode> = new Map()
  graph.nodes.forEach((carrying, id) => {
    const node = new ConveyorNode(new Decimal(carrying))
    node.id = id
    nodes.set(id, node)
  })
  graph.edges.forEach((edge) => {
    nodes.get(edge.src).link_to(nodes.get(edge.dst), new Decimal(edge.carrying))
  })

  return Array.from(nodes.values()).filter((node) => node.ins.length === 0)
}

export function even_split(
  root_node: ConveyorNode,
  out_amount: number,
  max_split: number = 3,
): ConveyorNode[] {
  let near_nodes: ConveyorNode[] = []
  let multiplier = root_node.holding.dividedBy(out_amount)

  function _split(
    node: ConveyorNode,
    into: number,
    back: ConveyorNode[],
  ): void {
    if (into < 2) {
      throw new Error("into < 2")
    }

    if (into <= max_split) {
      let target = into - back.length
      for (let i = 0; i < target; i++) {
        let new_node = new ConveyorNode()
        node.link_to(new_node, node.split_into(into))
        near_nodes.push(new_node)
      }
      for (let b of back) {
        node.link_to(b, node.split_into(into))
      }
      return
    }

    for (let s = 2; s <= max_split; s++) {
      if (into % s == 0) {
        for (let i = 0; i < s; i++) {
          let new_node = new ConveyorNode()
          let new_back = back.splice(0, into / s)
          // back = back.slice(into / s)
          node.link_to(new_node, node.split_into(s))
          _split(new_node, into / s, new_back)
        }
        return
      }
    }

    back.push(node)
    let new_node = new ConveyorNode()
    node.link_to(new_node, node.holding.plus(multiplier))
    _split(new_node, into + 1, back)
  }

  _split(root_node, out_amount, [])
  return near_nodes
}

export function split_by_factors(
  root_node: ConveyorNode,
  factors: Decimal[],
): ConveyorNode[] {
  if (factors.length === 0) {
    return [root_node]
  }
  if (!factors[0].isInteger()) {
    throw Error(`Factor not an integer (${factors[0]}`)
  } else if (factors[0].lessThan(2)) {
    throw Error(`Factor must be at least \`2\` | Got ${factors[0]}`)
  }

  let children: ConveyorNode[] = []
  let split = root_node.split_into(factors[0])
  for (let i = 0; factors[0].greaterThan(i); i++) {
    let new_node = new ConveyorNode()
    root_node.link_to(new_node, split)
    children.push(new_node)
  }
  return children.reduce<ConveyorNode[]>(
    (result, child) => result.concat(split_by_factors(child, factors.slice(1))),
    [],
  )
}

function merge(
  merge_nodes: ConveyorNode[],
  max_merge: number = 3,
  force_new_node: boolean = false,
): ConveyorNode {
  let to_node: ConveyorNode = new ConveyorNode()
  if (!force_new_node) {
    const new_to_node = merge_nodes.find((n) => n.ins.length < max_merge)
    if (new_to_node !== undefined) {
      to_node = new_to_node
      merge_nodes.splice(merge_nodes.indexOf(to_node), 1)
    }
  }
  for (
    let i = to_node.ins.length;
    i < max_merge && merge_nodes.length > 0;
    i++
  ) {
    merge_nodes.shift().link_to(to_node)
  }
  if (merge_nodes.length > 0) {
    merge_nodes.push(to_node)
    return merge(merge_nodes)
  }
  return to_node
}

/**
 * Merge nodes together. Checks to remove obsoleted splitters.
 * @param end_nodes - List of nodes to merge.
 * Expects all to be holding the same amount.
 * @param into - List of targets.
 * Sum(into) == end_nodes.length
 * @param max_merge - Maximum number of edges a single node can merge
 * Min = 2
 */
export function smart_merge(
  end_nodes: ConveyorNode[],
  into: Decimal[],
  max_merge = 3,
): ConveyorNode[] {
  let ends: ConveyorNode[] = []

  function _are_children_excess(
    curr_node: ConveyorNode,
    path: ConveyorNode[],
    keep_nodes: ConveyorNode[],
  ): ConveyorNode[] | null {
    if (keep_nodes.includes(curr_node)) {
      return [curr_node]
    } else if (path.includes(curr_node)) {
      return []
    } else if (curr_node.outs.length === 0 || curr_node.ins.length === 0) {
      return null
    }
    let excess_children = []
    path.push(curr_node)
    for (let link of curr_node.outs) {
      let result = _are_children_excess(link.dst, path, keep_nodes)
      if (result === null) {
        return null
      }
      result.forEach((e) => excess_children.push(e))
    }
    return excess_children
  }

  function _smart_merge(merge_nodes: ConveyorNode[]): ConveyorNode {
    for (let i = 0; i < merge_nodes.length; i++) {
      if (merge_nodes[i].ins.length === 0) {
        continue
      }
      const root = merge_nodes[i].ins[0].src
      const result = _are_children_excess(root, [], merge_nodes)
      if (result === null) {
        continue
      }
      for (let node of result) {
        if (node.ins[0].src === root) {
          merge_nodes.splice(merge_nodes.indexOf(node), 1)
        }
      }
      root.unlink_to_all()
      merge_nodes.push(root)
      while (root.ins.length > 1) {
        root.ins[1].remove_link()
      }
      // Restart for loop
      i = -1
    }
    if (merge_nodes.length > 1) {
      return merge(merge_nodes, max_merge, false)
    }
    return merge_nodes[0]
  }

  for (let i = 0, start = 0; i < into.length; i++) {
    let end = start + into[i].toNumber()
    let merged = _smart_merge(end_nodes.slice(start, end))
    ends.push(merged)
    start = end
  }
  return ends
}

export function clean_up_graph(
  start_nodes: ConveyorNode[],
  max_merge = 3,
): Map<string, ConveyorNode[]> {
  let seen_nodes: ConveyorNode[] = []
  let key_nodes: Map<string, ConveyorNode[]> = new Map()
  key_nodes.set("start", start_nodes)
  key_nodes.set("end", [])
  key_nodes.set("islands", [])
  // key_nodes.set('removed', new Array())

  function _clean_up(curr_node: ConveyorNode): boolean {
    if (seen_nodes.includes(curr_node)) {
      return false
    }
    seen_nodes.push(curr_node)

    // ToDo: Add merge limit.

    let change_made: boolean = true

    switch (curr_node.node_type) {
      case NodeTypes.Island:
        change_made = false
        break

      case NodeTypes.Source:
        if (!key_nodes.get("start").includes(curr_node)) {
          key_nodes.get("start").push(curr_node)
        }
        change_made = false
        break

      case NodeTypes.Source_Splitter:
        let output = curr_node.sum_outs
        let from_node = new ConveyorNode(output)
        from_node.link_to(curr_node)
        curr_node.holding = curr_node.holding.minus(output)

        let starts = key_nodes.get("start")
        starts.splice(starts.indexOf(curr_node), 1)
        starts.push(from_node)
        break

      case NodeTypes.Destination:
        if (!key_nodes.get("end").includes(curr_node)) {
          key_nodes.get("end").push(curr_node)
        }
        change_made = false
        break

      case NodeTypes.Pass_Through:
        let src_node: ConveyorNode = curr_node.ins[0].src
        let dst_node: ConveyorNode = curr_node.outs[0].dst
        let relink: Decimal = curr_node.ins[0].carrying

        if (!curr_node.outs[0].carrying.eq(relink)) {
          console.error(
            `${curr_node.outs[0].carrying} != ${relink}`,
            curr_node.holding,
          )
          console.error(
            find_edges_and_nodes(...start_nodes),
            "\n",
            curr_node.id,
          )
          throw new Error("!curr_node.outs[0].carrying.eq(relink)")
        }

        curr_node.ins[0].remove_link()
        curr_node.outs[0].remove_link()

        if (!curr_node.sum_ins.eq(0) || !curr_node.sum_outs.eq(0)) {
          throw new Error("unlinked failed" + curr_node)
        }

        src_node.link_to(dst_node, relink)
        break

      case NodeTypes.Splitter:
      case NodeTypes.Merger:
        change_made = false
        break

      case NodeTypes.Merger_Destination:
        let to_node_md = new ConveyorNode()
        curr_node.link_to(to_node_md)
        let ends = key_nodes.get("end")
        ends.splice(ends.indexOf(curr_node))
        ends.push(to_node_md)
        break

      case NodeTypes.Merge_Splitter:
        let to_node_ms: ConveyorNode = new ConveyorNode()
        let carrying: Decimal = curr_node.sum_outs

        for (let out_link of curr_node.outs) {
          out_link.remove_link()
          to_node_ms.link_to(out_link.dst, out_link.carrying)
        }

        if (!carrying.eq(curr_node.holding)) {
          throw new Error("!carrying.eq(curr_node.holding")
        }

        curr_node.link_to(to_node_ms, carrying)
        break

      default:
        console.error(curr_node)
        throw new Error("Unknown Node Type" + curr_node.node_type)
    }

    curr_node.outs.forEach(
      (l) => (change_made = _clean_up(l.dst) || change_made),
    )
    return change_made
  }

  let done: boolean = false
  while (!done) {
    done = true
    start_nodes.forEach((n) => (done = !_clean_up(n) && done))
    seen_nodes = []
  }

  return key_nodes
}
