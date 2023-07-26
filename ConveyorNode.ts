import { Decimal } from './decimal.js'

class ConveyorLink {
    private _src: ConveyorNode
    private _dst: ConveyorNode
    private _carrying: Decimal

    get src(): ConveyorNode {return this._src}
    get dst(): ConveyorNode {return this._dst}
    get carrying(): Decimal {return this._carrying}

    constructor(src: ConveyorNode, dst: ConveyorNode, carrying: Decimal | undefined = undefined) {
        if (carrying == undefined) {
            carrying = src.splittable
        }

        this._src = src
        this._dst = dst
        this._carrying = carrying

        src.holding = src.holding.minus(carrying)
        dst.holding = dst.holding.plus(carrying)
        src.outs.push(this)
        dst.ins.push(this)

        if (dst.outs.length <= 1){
            dst.depth = src.depth + 1
        } else {
            dst.depth = Math.min(src.depth + 1, dst.depth)
        }
    }

    public remove_link(): void {
        this.src.holding = this.src.holding.plus(this.carrying)
        this.dst.holding = this.dst.holding.minus(this.carrying)
        this.src.outs.splice(this.src.outs.indexOf(this), 1)
        this.dst.ins.splice(this.dst.ins.indexOf(this), 1)

        let new_depth = 0
        for (let src of this.dst.ins) {
            if (new_depth === 0 || src.src.depth < new_depth) {
                new_depth = src.src.depth
            }
        }
    }
}


enum NODE_TYPES {
    Island = '0,0',
    Source = '0,1',
    Source_Splitter = '0,2',
    Destination = '1,0',
    Pass_Through = '1,1',
    Splitter = '1,2',
    Merger_Destination = '2,0',
    Merger = '2,1',
    Merge_Splitter = '2,2',
}

class ConveyorNode {

    holding: Decimal
    depth: number = 0
    ins: ConveyorLink[]
    outs: ConveyorLink[]

    private static _ids: WeakMap<ConveyorNode, number> = new WeakMap()
    private static _curr_id: number = 0


    constructor(holding: Decimal = new Decimal(0)) {
        this.holding = holding
        this.ins = new Array()
        this.outs = new Array()
    }


    public link_to(dst: ConveyorNode, carrying: Decimal | undefined = undefined) {
        new ConveyorLink(this, dst, carrying)
    }

    public unlink_to(dst: ConveyorNode, carrying: Decimal | undefined) {
        this.outs.find(link => link.src === this && link.dst === dst && link.carrying === carrying)
    }

    public unlink_to_all() {
        while (this.outs.length != 0) {
            this.outs[0].remove_link()
        }
    }

    public unlink_from_all() {
        while (this.ins.length != 0) {
            this.ins[0].remove_link()
        }
    }

    private static _sum_connections(connections: ConveyorLink[]): Decimal {
            let total: Decimal = new Decimal(0)
            for (let link of connections) {
                total = total.plus(link.carrying)
            }
            return total
    }

    get sum_ins(): Decimal {
        return new Decimal(ConveyorNode._sum_connections(this.ins))
    }

    get sum_outs(): Decimal {
        return new Decimal(ConveyorNode._sum_connections(this.outs))
    }

    get splits_evenly(): boolean {
        let target: Decimal = this.sum_outs.div(this.outs.length)
        for (let out of this.outs) {
            if (out.carrying !== target) {
                return false
            }
        }
        return true
    }

    get splittable(): Decimal {
        return this.outs.length > 0 ? this.outs[0].carrying : this.holding
    }

    public split_into(r: Decimal | number): Decimal {
        if (this.holding === new Decimal(0)) {
            return this.holding
        } else if (this.outs.length > 0) {
            return this.splittable
        } 
        return this.holding.div(r)
    }

    get id(): number {
        let id = ConveyorNode._ids.get(this)
        if (id === undefined) {
            id = ConveyorNode._curr_id++
            ConveyorNode._ids.set(this, id)
        }
        return id
    }

    get node_type(): string {
        return [
                Math.min(this.ins.length, 2),
                Math.min(this.outs.length, 2)
            ].toString()
    }
}

function findEdgesAndNodes (...root_nodes: ConveyorNode[]) {
    const edges: ConveyorLink[] = new Array()
    const nodes: ConveyorNode[] = new Array()
    function _findEdgesAndNodes(curr_node: ConveyorNode) {
        if (nodes.indexOf(curr_node) === -1) {
            nodes.push(curr_node)
            curr_node.outs.forEach(e => edges.push(e))
            curr_node.outs.forEach(e => _findEdgesAndNodes(e.dst))
        }
    }
    root_nodes.forEach(e => (_findEdgesAndNodes(e)))
    return {edges: edges, nodes: nodes}
}

function ratio(targets: Decimal[]): Decimal[] {

    function gcd(a: Decimal, b: Decimal): Decimal {
        let r: Decimal;
        while (a.mod(b).gt(0)) {
            r = a.mod(b)
            a = b
            b = r
        }
        return b
    }

    function lcm (a: Decimal, b: Decimal): Decimal {
        return a.mul(b).div(gcd(a, b))
    }

    let numerators: Decimal[] = new Array()
    let denominators: Decimal[] = new Array()
    for (let value of targets) {
        let [numerator, denominator] = value.toFraction()
        numerators.push(numerator)
        denominators.push(denominator)
    }
    
    let lcd = denominators.reduce((_lcm, element) => lcm(_lcm, element))

    for (let index in numerators) {
        let by = lcd.dividedToIntegerBy(denominators[index])
        numerators[index] = numerators[index].mul(by)
        denominators[index] = denominators[index].mul(by)
    }

    let gcf = numerators.reduce((_gcd, element) => gcd(_gcd, element))

    for (let numerator in numerators) {
        numerators[numerator] = numerators[numerator].dividedToIntegerBy(gcf)
    }

    return numerators
}

function even_split(
        root_node: ConveyorNode,
        out_amount: number,
        max_split: number = 3)
        :ConveyorNode[] {
    let near_nodes: ConveyorNode[] = []
    let multiplier = root_node.holding.div(out_amount)

    function _split(
            node: ConveyorNode,
            into: number,
            back: ConveyorNode[]):
            void {
        if (into < 2) {throw new Error('into < 2')}

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
                    back = back.slice(into / s)
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

    _split(root_node, out_amount, new Array())
    return near_nodes
}

function merge(
    merge_nodes: ConveyorNode[],
    max_merge: number = 3,
    force_new_node: boolean = false
): ConveyorNode {
    let to_node: ConveyorNode = new ConveyorNode()
    if (!force_new_node) {
        const new_to_node = merge_nodes.find(n => n.ins.length < max_merge)
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
        merge_nodes.splice(0, 1)[0].link_to(to_node)
    }
    if (merge_nodes.length > 0) {
        merge_nodes.push(to_node)
        return merge(merge_nodes)
    }
    return to_node
}

function smart_merge(
    end_nodes: ConveyorNode[],
    into: Decimal[],
    max_merge = 3,
): ConveyorNode[] {

    let ends: ConveyorNode[] = []

    function _are_children_excess(
        curr_node: ConveyorNode,
        path: ConveyorNode[],
        keep_nodes: ConveyorNode[]
    ): ConveyorNode[] | null {
        if (keep_nodes.includes(curr_node)) {
            return [curr_node]
        } else if (path.includes(curr_node)) {
            return []
        } else if (curr_node.outs.length === 0) {
            return null
        }
        let excess_children = new Array()
        path.push(curr_node)
        for (let link of curr_node.outs) {
            let result = _are_children_excess(link.dst, path, keep_nodes)
            if (result === null) {
                return null
            }
            result.forEach(e => excess_children.push(e))
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

function clean_up_graph(
    start_nodes: ConveyorNode[],
    max_merge = 3
): Map<string, ConveyorNode[]> {
    let seen_nodes: ConveyorNode[] = new Array()
    let key_nodes: Map<string, ConveyorNode[]> = new Map()
    key_nodes.set('start', start_nodes)
    key_nodes.set('end', new Array())
    key_nodes.set('islands', new Array())
    // key_nodes.set('removed', new Array())

    function _clean_up(curr_node: ConveyorNode): boolean {
        if (seen_nodes.includes(curr_node)) {
            return false
        }
        seen_nodes.push(curr_node)

        // ToDo: Add merge limit.

        let change_made: boolean = true

        switch (curr_node.node_type) {
            case NODE_TYPES.Island:
                change_made = false
                break
            
            case NODE_TYPES.Source:
                if (!key_nodes.get('start').includes(curr_node)) {
                    key_nodes.get('start').push(curr_node)
                }
                change_made = false
                break

            case NODE_TYPES.Source_Splitter:
                let output = curr_node.sum_outs
                let from_node = new ConveyorNode(output)
                from_node.link_to(curr_node)
                curr_node.holding = curr_node.holding.minus(output)
                
                let starts = key_nodes.get('start')
                starts.splice(starts.indexOf(curr_node), 1)
                starts.push(from_node)
                break
            
            case NODE_TYPES.Destination:
                if (!key_nodes.get('end').includes(curr_node)) {
                    key_nodes.get('end').push(curr_node)
                }
                change_made = false
                break

            case NODE_TYPES.Pass_Through:
                let src_node: ConveyorNode = curr_node.ins[0].src
                let dst_node: ConveyorNode = curr_node.outs[0].dst
                let relink: Decimal = curr_node.ins[0].carrying
                
                if (!curr_node.outs[0].carrying.eq(relink)){
                    console.error(`${curr_node.outs[0].carrying} != ${relink}`, curr_node.holding)
                    console.error(findEdgesAndNodes(...start_nodes), '\n', curr_node.id)
                    throw new Error('!curr_node.outs[0].carrying.eq(relink)')
                }
                
                curr_node.ins[0].remove_link()
                curr_node.outs[0].remove_link()

                if (!curr_node.sum_ins.eq(0) || !curr_node.sum_outs.eq(0)) {
                    throw new Error('unlinked failed' + curr_node)
                }

                src_node.link_to(dst_node, relink)
                break

            case NODE_TYPES.Splitter:
            case NODE_TYPES.Merger:
                change_made = false
                break

            case NODE_TYPES.Merger_Destination:
                let to_node_md = new ConveyorNode()
                curr_node.link_to(to_node_md)
                let ends = key_nodes.get('end')
                ends.splice(ends.indexOf(curr_node))
                ends.push(to_node_md)
            
            case NODE_TYPES.Merge_Splitter:
                let to_node_ms: ConveyorNode = new ConveyorNode()
                let carrying: Decimal = curr_node.sum_outs

                for (let out_link of curr_node.outs) {
                    out_link.remove_link()
                    to_node_ms.link_to(out_link.dst, out_link.carrying)
                }

                if (!carrying.eq(curr_node.holding)) {
                    throw new Error('!carrying.eq(curr_node.holding')
                }

                curr_node.link_to(to_node_ms, carrying)
                break
            
            default:
                console.error(curr_node)
                throw new Error('Unknown Node Type' + curr_node.node_type)
        }

        curr_node.outs.forEach(l => change_made = _clean_up(l.dst) || change_made)
        return change_made
    }

    let done: boolean = false
    while (!done) {
        done = true
        start_nodes.forEach(n => done = !_clean_up(n) && done)
        seen_nodes = new Array()
    }

    return key_nodes
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
    clean_up_graph(root_nodes)
    return root_nodes
}

function main_split(
    into: Array<number | Decimal>,
    max_split: number = 3
): ConveyorNode[] {
    const root_nodes = new Array()
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


function find_machine_count(
    clock: Decimal,
    start_at: number = 2,
    decimals: number = 6
) {
    for (let count = start_at; clock.div(count).gte(0.1); count++) {
        if (clock.div(count).toDecimalPlaces(decimals).mul(count).eq(clock)){
            return count
        }
    }
    return -1
}