import argparse
from fractions import Fraction
from operator import itemgetter
from sys import argv
from typing import List, Set

import graphviz as gv
# REMOVE YAML: Switch comment on next two lines
# import json
import yaml

import conveyor_nodes as cn

NODE_ATTR = {'Island': {},
             'Source': {'shape': 'house'},
             'Source Splitter': {},
             'Destination': {'shape': 'invhouse'},
             'Pass Through': {'shape': 'point'},
             'Splitter': {'shape': 'diamond'},
             'Merger Destination': {'shape': 'Msquare'},
             'Merger': {'shape': 'square'},
             'Merge Splitter': {},
             'Uneven Splitter': {'shape': 'Mdiamond'}}
GRAPH_ATTR = {'splines': 'ortho'}


def graph_nodes(graph, start_nodes: set):
    graphed_nodes = {}
    graphed_edges = set()
    constrain_nodes = set()

    node_name = {(0, 0): lambda n: str(n),
                 (0, 1): lambda n: cn.format_float(n.sum_outs),
                 (0, 2): lambda n: str(n),
                 (1, 0): lambda n: cn.format_float(n.sum_ins),
                 (1, 1): lambda n: str(n),
                 (1, 2): lambda n: '',
                 (2, 0): lambda n: str(n),
                 (2, 1): lambda n: '',
                 (2, 2): lambda n: str(n)}

    node_attr = {(0, 0): 'Island',
                 (0, 1): 'Source',
                 (0, 2): 'Source Splitter',
                 (1, 0): 'Destination',
                 (1, 1): 'Pass Through',
                 (1, 2): 'Splitter',
                 (2, 0): 'Merger Destination',
                 (2, 1): 'Merger',
                 (2, 2): 'Merge Splitter'}

    def _graph_nodes(curr_node: cn.ConveyorNode):
        nonlocal graphed_nodes, graphed_edges, node_attr

        if curr_node not in graphed_nodes:
            node_type = (min(len(curr_node.ins), 2),
                         min(len(curr_node.outs), 2))
            if node_type == (0, 0):
                return
            elif node_type == (1, 2) and not curr_node.splits_evenly:
                graph.node(curr_node.id, node_name[node_type](curr_node),
                           **NODE_ATTR['Uneven Splitter'])
            else:
                graph.node(curr_node.id, node_name[node_type](curr_node),
                           **NODE_ATTR[node_attr[node_type]])
            graphed_nodes[curr_node] = node_type

            for dst_node in curr_node.outs.copy():
                _graph_nodes(dst_node)

        for src_node, links in curr_node.ins.items():
            if (src_node, curr_node) in graphed_edges or \
                    src_node not in graphed_nodes:
                continue
            graphed_edges.add((src_node, curr_node))
            for carrying, times in links.items():
                for _ in range(times):
                    # xlabels or normal labels?
                    # xlabels don't work, but labels say to use xlabels
                    graph.edge(src_node.id, curr_node.id,
                               label=cn.format_float(carrying),
                               constraint=str(
                                   curr_node not in constrain_nodes))
                    constrain_nodes.add(curr_node)

    for node in start_nodes:
        _graph_nodes(node)


def make_nodes(*holdings: Fraction) -> Set[cn.ConveyorNode]:
    return {cn.ConveyorNode(holding=h) for h in holdings}


def quick_graph(name: str, nodes: set, view=True, **kwargs):
    """Simple function to quickly graph nodes and catches ortho issues."""
    my_graph = make_graph(name, **kwargs)
    graph_nodes(my_graph, nodes)
    if view:
        try:
            my_graph.view()
        # This is when ortho lines become unhappy for some reason
        except gv.backend.execute.CalledProcessError:
            if 'graph_attr' in kwargs and 'splines' in kwargs['graph_attr'] \
                    and kwargs['graph_attr']['splines'] == 'ortho':
                kwargs['graph_attr']['splines'] = 'polyline'
            my_graph = make_graph(name, **kwargs)
            graph_nodes(my_graph, nodes)
            my_graph.view()
            return my_graph
    return my_graph


def make_graph(name: str, engine: str = 'dot',
               graph_attr: dict = None, directory: str = '',
               format_: str = 'pdf', **kwargs) -> gv.Digraph:
    if graph_attr is not None:
        graph_attr = {'splines': 'ortho', **graph_attr}
    else:
        graph_attr = {'splines': 'ortho'}
    return gv.Digraph(name, engine=engine, graph_attr=graph_attr,
                      directory=directory, format=format_, **kwargs)


def main(*num: Fraction, name: str = 'foo',
         max_merge: int = 3, max_split: int = 3, engine: str = 'dot',
         format: str = 'png', belts: List[int] = None, mk: int = 5,
         directory: str = ''):
    if num is None:
        raise ValueError('No value(s) given for num.')

    root_node = make_nodes(sum(num)).pop()
    to_node = cn.ConveyorNode()
    to_node.link_from(root_node)

    if len(num) > 1:
        remove, ratio_ = itemgetter('remove', 'ratio')(
            cn.smart_ratio(*num, mk=mk, alt_belts=belts))
        cn.smart_split(to_node, remove, ratio_, max_split, max_merge)

        # Uncomment below to see what it looks like before simplifying.
        # quick_graph(f'{name}pre', {root_node}, view)
    elif len(num) == 1:
        if isinstance(num[0], Fraction):
            use = int(num[0])
        elif isinstance(num[0], float):
            try:
                use = int(cn.format_float(num[0]))
            except ValueError:
                raise TypeError(
                    f'If only one value is provided, it has to be an '
                    f'int, got {num[0]}, which could not be cast to an '
                    f'int without loosing {num[0] - int(num[0])}.)')
        elif isinstance(num[0], int):
            use = num[0]
        else:
            raise TypeError('If only one value is provided, '
                            f'it has to be an int, got {type(num[0])}')
        cn.even_split(to_node, use, max_split)

    _jic = cn.simplify_graph({root_node})
    return quick_graph(name, {root_node}, engine=engine, format_=format,
                       directory=directory), root_node


def main_file(filename):
    with open(filename) as file:
        if filename.lower().endswith('.json'):
            # REMOVE YAML: Switch comment on next two lines.
            # settings = iter(json.load(file))
            settings = iter(yaml.safe_load(file))

        # REMOVE YAML: Switch comment on next two lines. (Maybe unnecessary)
        elif filename.lower().endswith(('.yaml', 'yml')):
            settings = yaml.safe_load_all(file)
        else:
            raise IOError('Unrecognized File Type')

        config = next(settings)
        # MAX_MERGE, MAX_SPLIT = config['MAX_MERGE'], config['MAX_SPLIT']
        # ENGINE = config['ENGINE']
        # FORMAT = config['FORMAT']
        # NODE_ATTR = config['NODE_ATTR']
        # GRAPH_ATTR = config['GRAPH_ATTR']
        # BELTS, MK = config['BELTS'], config['MK']
        # DIRECTORY = config['DIRECTORY']
        for key, element in config.copy().items():
            if key == 'NODE_ATTR':
                NODE_ATTR.update(element)
                del config[key]
            elif key == 'GRAPH_ATTR':
                GRAPH_ATTR.update(element)
                del config[key]
            elif key.lower() != key:
                config[key.lower()] = element
                del config[key]

        do = next(settings)
        if 'Calculate' in do:
            try:
                calc = list(next(settings))
                calc = [Fraction(*i) for i in calc]
            except TypeError:
                raise ValueError('File has nothing to calculate.')
            main(*calc, name=do['Calculate'], **config)
            if 'Save Nodes' in do and do['Save Nodes']:
                print('Save Nodes has been replaced with '
                      'ConveyorNode.to_json. Call api.py instead.')
        if 'Graph' in do:
            print('Can no longer load nodes.')


def main_cli():
    parser = argparse.ArgumentParser(description='Calculate Satisfactory '
                                                 'Splitters and Graph Them.')

    parser.add_argument('into', metavar='N', type=Fraction, nargs='+',
                        help='what to split into')
    parser.add_argument('--belts', type=int, nargs='+',
                        help='Available belt speeds.')
    parser.add_argument('-b', type=int, default=5, dest='mk',
                        help='Highest available default belt. '
                             'Ignored if --belts provided')
    parser.add_argument('-s', '--split', type=int, default=3, dest='max_split',
                        help='Max number of splits per splitter.')
    parser.add_argument('-m', '--merge', type=int, default=3, dest='max_merge',
                        help='Max number of merges per merger.')
    parser.add_argument('-e', '--engine', type=str, default='dot',
                        help='Output layout engine. (How everything looks) '
                             'https://graphviz.org/docs/layouts/')
    parser.add_argument('-f', '--format', type=str, default='pdf',
                        help='Output file type. '
                             'https://graphviz.org/docs/outputs/')
    parser.add_argument('--to-file', type=str, default='splitters',
                        help='Filename to save to (w/o extension)')

    args = parser.parse_args()
    # print(args)
    if any([i <= 0 for i in args.into]):
        raise ValueError(f'Inputs must be greater than 0')

    foo = vars(args).copy()
    del foo['into']
    del foo['to_file']
    # print(args)
    main(*args.into, name=args.to_file, **foo)

    # root_node =
    # cn.ConveyorNode(sum([cn.from_fraction(f) for f in args.into]))
    # to_node = cn.ConveyorNode()
    # to_node.link_from(root_node)
    #
    # if len(args.into) > 1:
    #     remove, ratio = itemgetter('remove', 'ratio')(
    #         cn.smart_ratio(*args.into))
    #     cn.smart_split(to_node, remove, ratio)
    # else:
    #     cn.even_split(to_node, int(args.into[0]))
    #
    # cn.simplify_graph({root_node})
    #
    # quick_graph


if __name__ == '__main__':

    if len(argv) > 1:
        if argv[1].endswith(('.json', 'yaml')):
            main_file(argv[1])
        else:
            main_cli()
