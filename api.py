import argparse
import json
from fractions import Fraction
from operator import itemgetter

import conveyor_nodes as cn


def create_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Calculate Splitters')

    parser.add_argument('into', metavar='N', type=Fraction, nargs='+',
                        help='what to split into')

    belts = parser.add_argument_group('Belts (Mutually Exclusive)')
    belts = belts.add_mutually_exclusive_group()
    belts.add_argument('--belts', type=int, nargs='+',
                       help='Available belt speeds.')
    belts.add_argument('-b', type=int, default=5, dest='mk',
                       help='Highest available default belt.')

    nodes = parser.add_argument_group('Node Behavior')
    nodes.add_argument('-s', '--split', type=int, default=3, dest='max_split',
                       metavar='S', help='Max number of splits per splitter.')
    nodes.add_argument('-m', '--merge', type=int, default=3, dest='max_merge',
                       metavar='M', help='Max number of merges per merger.')

    parser.add_argument('--to-file', type=str, default='', metavar='FILE',
                        help='Save output to specified file.')
    return parser


def main(*args):
    parser = create_arg_parser()
    args = parser.parse_args(*args)
    # print(args)
    if any([i <= 0 for i in args.into]):
        raise ValueError(f'Inputs must be greater than 0')
    # fractions = []
    # for i in args.into:
    #     if i > 0:
    #         fractions.append(list(i.as_integer_ratio()))
    #     else:
    # print(fractions)

    root_node = cn.ConveyorNode(sum(args.into))
    to_node = cn.ConveyorNode()
    to_node.link_from(root_node)

    if len(args.into) > 1:
        remove, ratio = itemgetter('remove', 'ratio')(
            cn.smart_ratio(*args.into, mk=args.mk, alt_belts=args.belts))
        cn.smart_split(to_node, remove, ratio, args.max_split, args.max_merge)
    else:
        cn.even_split(to_node, int(args.into[0]), args.max_split)

    cn.simplify_graph({root_node})

    as_json = cn.ConveyorNode.to_json({root_node})
    if args.to_file == '':
        print(json.dumps(as_json))
    else:
        print(args.to_file)
        with open(args.to_file, 'w+') as file:
            json.dump(as_json, file, indent=2)


if __name__ == '__main__':
    main()
