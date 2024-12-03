import { Decimal } from "decimal.js"
import { main_split } from "../calculate.ts"
import { ConveyorNode, serialize } from "../ConveyorNode"

onmessage = (e: MessageEvent) => {
  const into: Decimal[] = e.data.into
  const max_split: number = e.data.max_split
  const bottleneck_threshold: Decimal = new Decimal(e.data.bottleneck_threshold)
  const graph: ConveyorNode[] = main_split(
    into,
    max_split,
    bottleneck_threshold,
  )

  const keys = serialize(...graph)
  postMessage(keys)
}
