import { Fraction } from "fraction.js"

type MultiSet = Map<string, number>

export function sum(...items: Array<number | Fraction>): Fraction {
  return items.reduce<Fraction>((_sum, item) => _sum.add(item), new Fraction(0))
}

export function max(...items: Array<number | Fraction>): Fraction {
  return items.reduce<Fraction>(
    (_max, item) =>
      _max == undefined || _max.lt(item) ? new Fraction(item) : _max,
    undefined,
  )
}

function factorial(n: number): Fraction {
  let fact = new Fraction(1)
  for (let i = 1; i <= n; i++) {
    fact = fact.mul(i)
  }
  return fact
}

function toMultiset(items: Fraction[]): MultiSet {
  return items.reduce<MultiSet>(
    (set, item) =>
      set.set(item.toFraction(), (set.get(item.toString()) || 0) + 1),
    new Map<string, number>(),
  )
}

/**
 * Counts the unique permutations of `items`
 * @param items
 */
export function countMultisetPermutations(items: Fraction[]): Fraction {
  // P = n! / (k1! * k2! * ... * km!)
  let n = factorial(items.length)
  let k = new Fraction(1)
  toMultiset(items).forEach((count) => (k = k.mul(factorial(count))))
  return n.div(k)
}

/**
 * Generator for all unique permutations of `items`
 * @param items
 */
export function multisetPermutations(items: Fraction[]): Generator<Fraction[]> {
  return _multisetPermutations(toMultiset(items))
}

function* _multisetPermutations(items: MultiSet): Generator<Fraction[]> {
  // Edge Case
  if (items == undefined) {
    yield undefined
  }
  // Edge Case | 1 item -> 1 permutation
  else if (items.size == 1) {
    const [item, count] = items.entries().next().value as [string, number]
    yield Array<Fraction>(count).fill(new Fraction(item))
  }
  // Base Case | All item counts == 0
  else if (
    Array.from(items.values()).find((count) => count != 0) === undefined
  ) {
    yield []
  }
  // Recursive Case
  else {
    for (let [item, count] of items) {
      if (count == 0) {
        continue
      }
      items.set(item, count - 1) // Probably easier than making new Map
      for (let foo of _multisetPermutations(items)) {
        yield foo.concat(new Fraction(item))
      }
      items.set(item, count)
    }
  }
}

const found_primes: Fraction[] = [new Fraction(2)] // Basic memoization
function* primes(stopAt?: Fraction | number): Generator<Fraction> {
  let n: Fraction
  for (n of found_primes) {
    if (stopAt != undefined && n.gt(stopAt)) {
      return
    }
    yield n
  }
  for (n = n.add(1); stopAt == undefined || n.lte(stopAt); n = n.add(1)) {
    if (found_primes.find((p) => n.div(p).mod(1).equals(0)) === undefined) {
      // If not divisible by any other prime
      found_primes.push(n)
      yield n
    }
  }
}

const found_multiples: Map<number, Fraction[]> = new Map()

/**
 * Find the next smallest number with prime factors no bigger than `largest_factor`.
 * @param start
 * @param largest_factor
 */
export function find_next_multiple(
  start: Fraction,
  largest_factor: number = 3,
): Fraction {
  if (!found_multiples.has(largest_factor)) {
    found_multiples.set(largest_factor, [new Fraction(2)])
  }
  let found = found_multiples.get(largest_factor)
  let n = found[found.length - 1]
  if (n.gte(start)) {
    return found.find((p) => p.gte(start))
  }

  while ((n = n.add(1))) {
    if (!prime_factorization(n).some((p) => p.gt(largest_factor))) {
      found.push(n)
      if (n.gte(start)) {
        return n
      }
    }
  }
  /* // Finds out of size order, e.g. 7 -> [3, 3, 3] vs [2, 2, 2, 2]
  for (let num_factors = 1; ; num_factors += 1) {
    for (let num_twos = num_factors; num_twos >= 0; num_twos--) {
      console.log(num_twos)
      let val = new Fraction(1)
        .mul(new Fraction(2).toPower(num_twos))
        .mul(new Fraction(3).toPower(num_factors - num_twos))

      if (val.gte(start)) {
        return val
      }
    }
  }*/
}

/**
 * Returns the prime factorization of `n`
 * @param n
 * @param smaller_first - return list in ascending order
 */
export function prime_factorization(
  n: Fraction,
  smaller_first: boolean = true,
): Fraction[] {
  let factorization: Fraction[] = []
  for (let p of primes(n)) {
    for (
      let quotient = n.div(p);
      quotient.mod(1).equals(0);
      quotient = quotient.div(p)
    ) {
      smaller_first ? factorization.push(p) : factorization.unshift(p)
    }
  }
  return factorization
}

export function ratio(targets: Fraction[]): Fraction[] {
  function greatestCommonDenominator(a: Fraction, b: Fraction): Fraction {
    let r: Fraction
    while (a.mod(b).gt(0)) {
      r = a.mod(b)
      a = b
      b = r
    }
    return b
  }

  function leastCommonMultiple(a: Fraction, b: Fraction): Fraction {
    return a.mul(b).div(greatestCommonDenominator(a, b))
  }

  let numerators: Fraction[] = []
  let denominators: Fraction[] = []
  for (let value of targets) {
    let [numerator, denominator] = [
      new Fraction(value.n),
      new Fraction(value.d),
    ]
    numerators.push(numerator)
    denominators.push(denominator)
  }

  let lcd = denominators.reduce((lcm, element) =>
    leastCommonMultiple(lcm, element),
  )

  for (let index in numerators) {
    let by = lcd.div(denominators[index])
    numerators[index] = numerators[index].mul(by)
    denominators[index] = denominators[index].mul(by)
  }

  let gcf = numerators.reduce((_gcd, element) =>
    greatestCommonDenominator(_gcd, element),
  )

  for (let numerator in numerators) {
    numerators[numerator] = numerators[numerator].div(gcf)
  }

  return numerators
}

if (import.meta.vitest) {
  const { describe, expect, test } = import.meta.vitest
  const to_decimals = (...items: (number | Fraction)[]) =>
    items.map((item) => new Fraction(item))

  describe("factorial", () =>
    test.for([
      [4, 24],
      [8, 40_320],
      [13, 6_227_020_800],
    ])("%i -> %i", ([n, result]) =>
      expect(factorial(n)).toEqual(new Fraction(result)),
    ))

  describe("toMultiset", () =>
    test.each([
      [[1, 1, 1], [[1, 3]]],
      [
        [1, 2, 3],
        [
          [1, 1],
          [2, 1],
          [3, 1],
        ],
      ],
    ])("%o -> %o", (items: number[], result: number[][]) =>
      expect(toMultiset(to_decimals(...items))).toEqual(
        new Map(result.map((r) => [r[0].toString(), r[1]])),
      ),
    ))

  describe("countMultisetPermutations", () =>
    test.each([
      [[1, 1, 1], 1],
      [[1, 2, 2], 3],
      [[1, 2, 3], 6],
    ])("%o -> %i", (items: number[], result: number) =>
      expect(countMultisetPermutations(to_decimals(...items))).toEqual(
        new Fraction(result),
      ),
    ))

  describe("multisetPermutations", () =>
    test.each([
      [[1, 1, 1], [[1, 1, 1]]],
      [
        [1, 2, 2],
        [
          [1, 2, 2],
          [2, 1, 2],
          [2, 2, 1],
        ],
      ],
      [
        [1, 2, 3],
        [
          [1, 2, 3],
          [1, 3, 2],
          [2, 1, 3],
          [2, 3, 1],
          [3, 1, 2],
          [3, 2, 1],
        ],
      ],
    ])("%o -> %o", (items: number[], results: number[][]) => {
      expect(new Set(multisetPermutations(to_decimals(...items)))).toEqual(
        new Set(results.map((perm) => to_decimals(...perm))),
      )
    }))

  test("primes", () =>
    expect(Array.from(primes(137))).toEqual(
      to_decimals(
        // Spread keeps prettier from putting each on a newline
        ...[
          2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61,
          67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137,
        ],
      ),
    ))
  describe("find_next_multiple", () =>
    test.each([
      [2, [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]],
      [3, [2, 3, 4, 6, 8, 9, 12, 16, 18, 24, 27]],
    ])("%i -> %o", (largest: number, results: number[]) => {
      for (let i = 2; i < results[results.length - 1]; i++) {
        expect(find_next_multiple(new Fraction(i), largest)).toEqual(
          new Fraction(results.find((n) => n >= i)),
        )
      }
    }))

  describe("prime_factorization", () =>
    test.each([
      [2, [2]],
      [3, [3]],
      [4, [2, 2]],
      [5, [5]],
      [6, [2, 3]],
      [7, [7]],
      [8, [2, 2, 2]],
      [9, [3, 3]],
      [16, [2, 2, 2, 2]],
      [36, [2, 2, 3, 3]],
    ])("%i -> %o", (n, factors) => {
      expect(prime_factorization(new Fraction(n), true)).toEqual(
        to_decimals(...factors),
      )
      expect(prime_factorization(new Fraction(n), false)).toEqual(
        to_decimals(...factors.reverse()),
      )
    }))

  describe("ratio", () =>
    test.each([
      [
        [60, 60],
        [1, 1],
      ],
      [
        [15, 30, 60],
        [1, 2, 4],
      ],
      [
        [0.5, 1, 1.5, 3],
        [1, 2, 3, 6],
      ],
    ])("%o -> %o", (input, result) =>
      expect(ratio(to_decimals(...input))).toEqual(to_decimals(...result)),
    ))
}
