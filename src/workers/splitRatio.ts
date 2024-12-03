import { Decimal } from "decimal.js"
import { main, main_find_best } from "../calculate.ts"
import { ConveyorNode, serialize } from "../ConveyorNode"

onmessage = (e: MessageEvent) => {
  const into: Decimal[] = e.data.into.map((v: number) => new Decimal(v))
  const from: Decimal[] = e.data.from.map((v: number) => new Decimal(v))
  const max_split: number = e.data.max_split
  const max_merge: number = e.data.max_merge
  const bottleneck_threshold: Decimal = new Decimal(e.data.bottleneck_threshold)
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
