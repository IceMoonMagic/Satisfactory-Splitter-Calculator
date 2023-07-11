import Decimal from 'decimal.js';
import { lcm, gcd } from 'mathjs';
// var Decimal = require('decimal.js')


// type ConveyorLink = Map<ConveyorNode, Map<Decimal, number>>

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
        this.src.ins.splice(this.src.ins.indexOf(this), 1)
        this.dst.ins.splice(this.dst.ins.indexOf(this), 1)

        let new_depth = 0
        for (let src of this.dst.ins) {
            if (new_depth === 0 || src.src.depth < new_depth) {
                new_depth = src.src.depth
            }
        }
    }
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
        for (let out of this.outs) {
            out.remove_link()
        }
    }

    public unlink_from_all() {
        for (let _in of this.ins) {
            _in.remove_link()
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
}

function to_dot(root_node) {
    let edges: ConveyorLink[] = new Array()
    let nodes: ConveyorNode[] = new Array()
    let constraints: ConveyorNode[] = new Array()
    function _to_dot(curr_node: ConveyorNode) {
        if (nodes.indexOf(curr_node) === -1) {
            nodes.push(curr_node)
            curr_node.outs.forEach(e => edges.push(e))
            curr_node.outs.forEach(e => _to_dot(e.dst))
        }
    }
    _to_dot(root_node)
    let output: string = "digraph G {\n"
    for (let node of nodes) {
        output += "\t" + node.id + " [label=\"" + node.sum_ins + "\"];\n"
    }
    for (let edge of edges) {
        output += "\t" + edge.src.id + " -> " + edge.dst.id + ";\n"
    }
    return output + "}"
}

function ratio(targets: Decimal[]): Decimal[] {
    let numerators: Decimal[] = new Array()
    let denominators: Decimal[] = new Array()
    for (let value of targets) {
        let [numerator, denominator] = value.toFraction()
        numerators.push(numerator)
        denominators.push(denominator)
    }
    
    // ToDo: Local lcm & gcd implementaions
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
        if (into < 2) {throw new Error()}

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

function even_merge(
        end_nodes: ConveyorNode[],
        into: Decimal[], max_merge = 3,
        respect_order = false)
        :ConveyorNode[] {
    if (! respect_order) {
        into.sort()
    }
    let ends: ConveyorNode[] = []
    
    function _merge(remaining_nodes: ConveyorNode[]): ConveyorNode {
        let to_node = new ConveyorNode()
        for (let i = 0; i < max_merge && remaining_nodes.length > 0; i++) {
            remaining_nodes.splice(0, 1)[0].link_to(to_node)
        }
        if (remaining_nodes.length > 0) {
            remaining_nodes.push(to_node)
            return _merge(remaining_nodes)
        }
        return to_node
    }

    console.log(_merge)
    
    for (let i = 0, start = 0; i < into.length; i++) {
        console.log(_merge)
        let end = start + into[i].toNumber()
        let merged = _merge(end_nodes.slice(start, end))
        ends.push(merged)
    }
    return ends
}