import itertools
import unittest
from unittest import TestCase
import api
from typing import Iterable, List
from fractions import Fraction

import conveyor_nodes


def combinations_up_to(iterable: list | str,
                       r: int = None) -> itertools.chain:
    if r is None:
        r = len(iterable)

    combos = []
    for i in range(r):
        combos = itertools.chain(combos,
                                 itertools.combinations(iterable, i + 1))
    # combos = [itertools.combinations(iterable, i) for i in range(r)]

    return combos


class TestArgParse(TestCase):
    # opt_args = ['--belts', '-b', '-s', '-m', '--to-file']

    def parse_args(self, *args):
        return self.parser.parse_args(self.base_args + list(args))

    def setUp(self) -> None:
        self.parser = api.create_arg_parser()
        self.base_args = ['8']

    def test_into(self) -> None:
        with self.subTest(into='', raises='SystemExit'):
            with self.assertRaises(SystemExit):
                self.parser.parse_args([''])

        for i in combinations_up_to(['5', '8', '30', '64',
                                     '1/3', '5/2', '1.25']):
            fractions = [Fraction(j) for j in i]
            with self.subTest(f'{i} -> {fractions}'):
                parsed = self.parser.parse_args(i)
                self.assertListEqual(parsed.into, fractions, parsed.into)

    def test_belts(self) -> None:
        with self.subTest(belts=''), self.assertRaises(SystemExit):
            self.parse_args('--belts', '')
        for i in [['60', '120']]:
            with self.subTest(belts=i):
                parsed = self.parse_args('--belts', *i)
                self.assertListEqual(parsed.belts, [int(j) for j in i])

    def test_b(self) -> None:
        for i in ['', '-1', '0', '6', '10']:
            with self.subTest(belts=i, expect_error=True):
                with self.assertRaises(SystemExit):
                    self.parse_args('-b', i)

        for i in [str(i + 1) for i in range(5)]:
            with self.subTest(belts=i, expect_error=False):
                parsed = self.parse_args('-b', i)
                self.assertEqual(parsed.mk, int(i))

    def test_mutual_exclusion(self) -> None:
        for group in ({'-b': ['5'], '--belts': ['60', '120', '270']},):
            for args in combinations_up_to(list(group)):
                with self.subTest(args=args, expect_error=len(args) == 1):
                    if len(args) == 1:
                        self.parse_args(args[0], *group[args[0]])
                    else:
                        with self.assertRaises(SystemExit):
                            test_args = []
                            for arg in args:
                                test_args.append(arg)
                                test_args += group[arg]
                            self.parse_args(test_args)


class InOut(TestCase):

    @staticmethod
    def _test_output(src, dst, given: List[int], out: List[int]):
        if len(src) != len(given):
            raise ValueError(f'src and given different lengths: '
                             f'{len(src)}, {len(given)}')
        if len(dst) != len(out):
            raise ValueError(f'dst and out different lengths: '
                             f'{len(dst)}, {len(out)}')
        for i in dst:
            if i.holding in out:
                out.pop()
            else:
                return False
        return True

    def test_even_split(self):
        for i in range(2, 500+1):
            with self.subTest(even_split=i):
                output = api.main_base(
                    [Fraction(i)], [60, 120, 270, 480, 780], 4, 3, 3)
                self.assertTrue(self._test_output(
                    [], output['end'], [], [1]*i))

    def test_split_into(self):
        for i in combinations_up_to(['5', '8', '30', '64',
                                     '1/3', '5/2', '1.25']):
            if len(i) == 1:
                continue
            fractions = [Fraction(j) for j in i]
            with self.subTest(f'{i} -> {fractions}'):
                api.main_base(fractions, [60, 120, 270, 480, 780], 4, 3, 3)
