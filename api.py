import argparse
import json
from fractions import Fraction
from operator import itemgetter

import conveyor_nodes as cn


def main(*args):
    parser = argparse.ArgumentParser(description='Calculate Splitters')

    parser.add_argument('into', metavar='N', type=Fraction, nargs='+',
                        help='what to split into')
    parser.add_argument('--belts', type=int, nargs='+',
                        help='Available belt speeds.')
    parser.add_argument('-b', type=int, nargs=1, default=5, dest='mk',
                        help='Highest available default belt. '
                             'Ignored if --belts provided')
    parser.add_argument('-s', '--split', type=int, default=3, dest='max_split',
                        help='Max number of splits per splitter.')
    parser.add_argument('-m', '--merge', type=int, default=3, dest='max_merge',
                        help='Max number of merges per merger.')
    parser.add_argument('--to-file', type=str, default='',
                        help='Save output to specified file.')

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
