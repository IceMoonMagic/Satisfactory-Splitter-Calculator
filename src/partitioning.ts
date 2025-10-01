import { Fraction } from "fraction.js"
import { sum } from "./math.ts"

export function partition(
  inputs: Fraction[],
  outputs: Fraction[],
  findOne: boolean = false,
): Fraction[][][] {
  const solutions: Fraction[][][] = []
  const partitions: Fraction[][] = new Array(outputs.length)
    .fill(null)
    .map(() => new Array(inputs.length))

  const _partition = (inputIndex: number): void => {
    if (inputIndex >= inputs.length) {
      solutions.push(partitions.map((partition) => partition.slice()))
      return
    }

    const nextInput = inputs[inputIndex]
    for (let [o, output] of outputs.entries()) {
      const partition = partitions[o]
      if (output.lt(sum(nextInput, ...partition))) {
        continue
      }
      partition.push(nextInput)
      _partition(inputIndex + 1)
      partition.pop()

      if (findOne && solutions.length != 0) {
        return
      }
    }
  }

  _partition(0)

  return solutions
}

// function solutionIsValid(
//   inputs: Fraction[],
//   outputs: Fraction[],
//   solution: Fraction[][],
// ): boolean {
//   for (let [o, output] of outputs.entries()) {
//     if (!output.equals(sum(...solution[o]))) {
//       return false
//     }
//   }

//   const flat_solution = solution.flat().sort((a, b) => a.sub(b).valueOf())
//   const sorted_inputs = inputs.sort((a, b) => a.sub(b).valueOf())

//   if (flat_solution.length !== sorted_inputs.length) {
//     return false
//   }

//   for (let i in sorted_inputs) {
//     if (!sorted_inputs[i].equals(flat_solution[i])) {
//       return false
//     }
//   }
//   return true
// }

function* splitIterator(
  inputs: Fraction[],
  splits: Fraction[][],
): Generator<Fraction[]> {
  // ToDo: Include "complexity" and loopback as part of output

  // Edge Case | Bad inputs
  if (
    inputs == undefined ||
    splits == undefined ||
    inputs.length !== splits.length
  ) {
    yield undefined
  }
  // Recursive & Base Case | 1 input to split
  else if (inputs.length === 1) {
    // Base Case | No more splits
    if (splits[0].length === 0) {
      yield inputs.slice()
    }
    // Recursive Case
    else {
      yield inputs.slice()
      for (let split of splitIteratorEqual(
        inputs[0].div(splits[0][0]),
        splits[0].slice(1),
        splits[0][0].valueOf(),
      )) {
        yield split
      }
    }
  }
  // Recursive Case
  else {
    for (let split_input of splitIterator(
      inputs.slice(0, 1),
      splits.slice(0, 1),
    )) {
      for (let rest_split of splitIterator(inputs.slice(1), splits.slice(1))) {
        yield split_input.concat(rest_split)
      }
    }
  }
}

function* splitIteratorEqual(
  input: Fraction,
  splits: Fraction[],
  repeat: number,
): Generator<Fraction[]> {
  // Edge Case | Bad inputs
  if (
    input == undefined ||
    splits == undefined ||
    repeat == undefined ||
    !Number.isInteger(repeat) ||
    repeat < 0
  ) {
    yield undefined
  }

  // Breadth Recursive Case
  if (repeat > 1) {
    for (let result of splitIteratorEqual(input, splits, repeat - 1)) {
      yield [input].concat(result)
    }
  } else {
    yield [input]
  }

  // Base Case | No more splits
  if (splits.length === 0) {
    return
  }

  // Depth Recursive
  // ToDo: Try with *every* factor (use mulitsets to avoid dupes)
  for (let result of splitIteratorEqual(
    input.div(splits[0]),
    splits.slice(1),
    splits[0].mul(repeat).valueOf(),
  )) {
    yield result
  }
}

export function foo(
  inputs: Fraction[],
  splits: Fraction[][],
  outputs: Fraction[],
) {
  console.log(inputs, splits, outputs)
  for (let split of splitIterator(inputs, splits)) {
    console.log(split, partition(split, outputs))
  }

  // const foo = new Fraction(3),
  //   bar = [new Fraction(3)]
  // console.log(foo, bar)
  // for (let resutl of splitIteratorEqual(foo, bar, 2)) {
  //   console.log(resutl)
  // }
}
