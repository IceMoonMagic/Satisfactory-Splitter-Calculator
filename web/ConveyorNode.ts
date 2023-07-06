import Decimal from 'decimal.js';



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
        src.ins.push(this)
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

    private static _ids: WeakMap<ConveyorNode, bigint> = new WeakMap()
    private static _curr_id: bigint = 0n


    constructor(holding: Decimal = new Decimal(0)) {
        this.holding = holding
        this.ins = new Array()
        this.outs = new Array()
    }


    public link_to(dst: ConveyorNode, carrying: Decimal | undefined) {
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

    get sum_ins(): Decimal {return new Decimal(ConveyorNode._sum_connections(this.ins))}
    get sum_outs(): Decimal {return new Decimal(ConveyorNode._sum_connections(this.outs))}

    get splits_evenly(): boolean {
        let target: Decimal = this.sum_outs.div(this.outs.length)
        for (let out of this.outs) {
            if (out.carrying !== target) {
                return false
            }
        }
        return true
    }

    get splittable(): Decimal {return this.outs.length > 0 ? this.outs[0].carrying : this.holding}

    get id(): bigint {
        let id = ConveyorNode._ids.get(this)
        if (id === undefined) {
            id = ConveyorNode._curr_id++
            ConveyorNode._ids.set(this, id)
        }
        return id
    }
}