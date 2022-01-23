import argparse
import json
from fractions import Fraction
from operator import itemgetter
from typing import Sequence, Dict, Set

import conveyor_nodes as cn
from conveyor_nodes import ConveyorNode


def create_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Calculate Splitters')

    parser.add_argument('into', metavar='N', type=Fraction, nargs='+',
                        help='what to split into')

    belts = parser.add_argument_group('Belts (Mutually Exclusive)')
    belts = belts.add_mutually_exclusive_group()
    belts.add_argument('--belts', type=int, nargs='+',
                       help='Available belt speeds.')
    belts.add_argument('-b', type=int, default=5, dest='mk',
                       choices=[1, 2, 3, 4, 5],
                       help='Highest available default belt.')

    nodes = parser.add_argument_group('Node Behavior')
    nodes.add_argument('-s', '--split', type=int, default=3, dest='max_split',
                       metavar='S', help='Max number of splits per splitter.')
    nodes.add_argument('-m', '--merge', type=int, default=3, dest='max_merge',
                       metavar='M', help='Max number of merges per merger.')

    parser.add_argument('--to-file', type=str, default='', metavar='FILE',
                        help='Save output to specified file.')
    return parser


def main_base(into: Sequence[Fraction], belts: Sequence[int], mk: int,
              max_split: int, max_merge: int) -> dict[str, set[ConveyorNode]]:
    if not len(into) > 0:
        raise ValueError(f'No inputs provided.')
    if not all([i > 0 for i in into]):
        raise ValueError(f'Inputs must be greater than 0')

    root_node = cn.ConveyorNode(sum(into))
    to_node = cn.ConveyorNode()
    to_node.link_from(root_node)

    if len(into) > 1:
        remove, ratio = itemgetter('remove', 'ratio')(
            cn.smart_ratio(*into, mk=mk, alt_belts=belts))
        cn.smart_split(to_node, remove, ratio, max_split, max_merge)
    else:
        if into[0].denominator != 1:
            raise ValueError(f'{into[0]} is not a natural number / int.')
        cn.even_split(to_node, int(into[0]), max_split)

    return cn.simplify_graph({root_node})


def main(*args):
    parser = create_arg_parser()
    args = parser.parse_args(*args)

    output = main_base(into=args.into, belts=args.belts, mk=args.mk,
                       max_split=args.max_split, max_merge=args.max_merge)

    as_json = cn.ConveyorNode.to_json(output['start'])
    if args.to_file == '':
        print(json.dumps(as_json))
    else:
        print(args.to_file)
        with open(args.to_file, 'w+') as file:
            json.dump(as_json, file, indent=2)


if __name__ == '__main__':
    main()
