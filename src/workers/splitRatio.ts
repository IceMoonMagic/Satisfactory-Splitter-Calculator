import { Fraction } from "fraction.js"
import { main, main_find_best } from "../calculate.ts"
import { ConveyorNode, serialize } from "../ConveyorNode"

onmessage = (e: MessageEvent) => {
  const into: Fraction[] = e.data.into.map((v: number) => new Fraction(v))
  const from: Fraction[] = e.data.from.map((v: number) => new Fraction(v))
  const max_split: number = e.data.max_split
  const max_merge: number = e.data.max_merge
  const bottleneck_threshold: Fraction =
    e.data.bottleneck_threshold != undefined
      ? new Fraction(e.data.bottleneck_threshold)
      : undefined
  const merge_level = e.data.merge_level
  const smaller_first = e.data.smaller_first
  let graph: ConveyorNode[]
  if (e.data.ratio_perms !== true) {
    graph = main(
      into,
      from,
      max_split,
      max_merge,
      bottleneck_threshold,
      smaller_first,
      merge_level,
    )
  } else {
    graph = main_find_best(
      into,
      from,
      max_split,
      max_merge,
      bottleneck_threshold,
      smaller_first,
      merge_level,
    )
  }

  const keys = serialize(...graph)
  postMessage(keys)
}
