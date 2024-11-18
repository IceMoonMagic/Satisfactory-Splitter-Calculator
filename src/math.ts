import Decimal from "decimal.js"

type MultiSet = Map<string, number>

function factorial(n: number): Decimal {
  let fact = new Decimal(1)
  for (let i = 1; i <= n; i++) {
    fact = fact.times(i)
  }
  return fact
}

function toMultiset(items: Decimal[]): MultiSet {
  return items.reduce<MultiSet>(
    (set, item) => set.set(item.toJSON(), (set.get(item.toString()) || 0) + 1),
    new Map<string, number>(),
  )
}

/**
 * Counts the unique permutations of `items`
 * @param items
 */
export function countMultisetPermutations(items: Decimal[]): Decimal {
  // P = n! / (k1! * k2! * ... * km!)
  let n = factorial(items.length)
  let k = new Decimal(1)
  toMultiset(items).forEach((count) => (k = k.times(factorial(count))))
  return n.dividedBy(k)
}

/**
 * Generator for all unique permutations of `items`
 * @param items
 */
export function multisetPermutations(items: Decimal[]): Generator<Decimal[]> {
  return _multisetPermutations(toMultiset(items))
}

function* _multisetPermutations(items: MultiSet): Generator<Decimal[]> {
  // Edge Case
  if (items == undefined) {
    yield undefined
  }
  // Edge Case | 1 item -> 1 permutation
  else if (items.size == 1) {
    const [item, count] = items.entries().next().value as [string, number]
    yield Array<Decimal>(count).fill(new Decimal(item))
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
        yield foo.concat(new Decimal(item))
      }
      items.set(item, count)
    }
  }
}

const found_primes: Decimal[] = [new Decimal(2)] // Basic memoization
function* primes(stopAt?: Decimal | number): Generator<Decimal> {
  let n: Decimal
  for (n of found_primes) {
    if (stopAt != undefined && n.greaterThan(stopAt)) {
      return
    }
    yield n
  }
  for (
    n = n.plus(1);
    stopAt == undefined || n.lessThanOrEqualTo(stopAt);
    n = n.plus(1)
  ) {
    if (
      found_primes.find((p) => n.dividedBy(p).mod(1).equals(0)) === undefined
    ) {
      // If not divisible by any other prime
      found_primes.push(n)
      yield n
    }
  }
}

const found_multiples: Map<number, Decimal[]> = new Map()

/**
 * Find the next smallest number with prime factors no bigger than `largest_factor`.
 * @param start
 * @param largest_factor
 */
export function find_next_multiple(
  start: Decimal,
  largest_factor: number = 3,
): Decimal {
  if (!found_multiples.has(largest_factor)) {
    found_multiples.set(largest_factor, [new Decimal(2)])
  }
  let found = found_multiples.get(largest_factor)
  let n = found[found.length - 1]
  if (n.greaterThanOrEqualTo(start)) {
    return found.find((p) => p.greaterThanOrEqualTo(start))
  }

  while ((n = n.plus(1))) {
    if (!prime_factorization(n).some((p) => p.greaterThan(largest_factor))) {
      found.push(n)
      if (n.greaterThanOrEqualTo(start)) {
        return n
      }
    }
  }
  /* // Finds out of size order, e.g. 7 -> [3, 3, 3] vs [2, 2, 2, 2]
  for (let num_factors = 1; ; num_factors += 1) {
    for (let num_twos = num_factors; num_twos >= 0; num_twos--) {
      console.log(num_twos)
      let val = new Decimal(1)
        .times(new Decimal(2).toPower(num_twos))
        .times(new Decimal(3).toPower(num_factors - num_twos))

      if (val.greaterThanOrEqualTo(start)) {
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
  n: Decimal,
  smaller_first: boolean = true,
): Decimal[] {
  let factorization: Decimal[] = []
  for (let p of primes(n)) {
    for (
      let quotient = n.dividedBy(p);
      quotient.mod(1).equals(0);
      quotient = quotient.dividedBy(p)
    ) {
      smaller_first ? factorization.push(p) : factorization.unshift(p)
    }
  }
  return factorization
}

export function ratio(targets: Decimal[]): Decimal[] {
  function greatestCommonDenominator(a: Decimal, b: Decimal): Decimal {
    let r: Decimal
    while (a.mod(b).greaterThan(0)) {
      r = a.mod(b)
      a = b
      b = r
    }
    return b
  }

  function leastCommonMultiple(a: Decimal, b: Decimal): Decimal {
    return a.times(b).dividedBy(greatestCommonDenominator(a, b))
  }

  let numerators: Decimal[] = []
  let denominators: Decimal[] = []
  for (let value of targets) {
    let [numerator, denominator] = value.toFraction()
    numerators.push(numerator)
    denominators.push(denominator)
  }

  let lcd = denominators.reduce((lcm, element) =>
    leastCommonMultiple(lcm, element),
  )

  for (let index in numerators) {
    let by = lcd.dividedToIntegerBy(denominators[index])
    numerators[index] = numerators[index].times(by)
    denominators[index] = denominators[index].times(by)
  }

  let gcf = numerators.reduce((_gcd, element) =>
    greatestCommonDenominator(_gcd, element),
  )

  for (let numerator in numerators) {
    numerators[numerator] = numerators[numerator].dividedToIntegerBy(gcf)
  }

  return numerators
}
