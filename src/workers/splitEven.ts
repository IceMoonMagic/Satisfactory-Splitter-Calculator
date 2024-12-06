import { Decimal } from "decimal.js"
import { main_split } from "../calculate.ts"
import { ConveyorNode, serialize } from "../ConveyorNode"

onmessage = (e: MessageEvent) => {
  const into: Decimal[] = e.data.into.map((v: number) => new Decimal(v))
  const max_split: number = e.data.max_split
  const bottleneck_threshold: Decimal =
    e.data.bottleneck_threshold != undefined
      ? new Decimal(e.data.bottleneck_threshold)
      : undefined
  const merge_level = e.data.merge_level
  const smaller_first = e.data.smaller_first
  const graph: ConveyorNode[] = main_split(
    into,
    max_split,
    bottleneck_threshold,
    smaller_first,
    merge_level,
  )

  const keys = serialize(...graph)
  postMessage(keys)
}
