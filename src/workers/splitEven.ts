import { Fraction } from "fraction.js"
import { main_split } from "../calculate.ts"
import { ConveyorNode, serialize } from "../ConveyorNode"

onmessage = (e: MessageEvent) => {
  const into: Fraction[] = e.data.into.map((v: number) => new Fraction(v))
  const max_split: number = e.data.max_split
  const bottleneck_threshold: Fraction =
    e.data.bottleneck_threshold != undefined
      ? new Fraction(e.data.bottleneck_threshold)
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
