#!/usr/bin/env python3.10

import argparse
from fractions import Fraction
from operator import itemgetter
from sys import argv
from typing import Set

import graphviz as gv
# REMOVE YAML: Switch comment on next two lines
# import json
import yaml

import conveyor_nodes as cn
import api

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


def format_float(num, max_dec=4) -> str:
    if isinstance(num, Fraction):
        return f'{float(num):.{max_dec}f}'.rstrip('0').rstrip('.')
    return f'{num:.{max_dec}f}'.rstrip('0').rstrip('.')


def graph_nodes(graph, start_nodes: set):
    graphed_nodes = {}
    graphed_edges = set()
    constrain_nodes = set()

    node_name = {(0, 0): lambda n: str(n),
                 (0, 1): lambda n: format_float(n.sum_outs),
                 (0, 2): lambda n: str(n),
                 (1, 0): lambda n: format_float(n.sum_ins),
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
                               label=format_float(carrying),
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
               format: str = 'pdf', **kwargs) -> gv.Digraph:
    if graph_attr is not None:
        graph_attr = {**GRAPH_ATTR, **graph_attr}
    else:
        graph_attr = {**GRAPH_ATTR}
    return gv.Digraph(name, engine=engine, graph_attr=graph_attr,
                      directory=directory, format=format, **kwargs)


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
                for i, e in enumerate(calc):
                    if isinstance(e, (list, tuple)):
                        calc[i] = Fraction(*e)
                    else:
                        calc[i] = Fraction(e)
            except (TypeError, StopIteration):
                raise ValueError('File has nothing to calculate.')
            output = api.main_base(calc, *itemgetter('belts', 'mk',
                                                     'max_split',
                                                     'max_merge')(config))
            quick_graph(do['Calculate'], output['start'],
                        engine=config['engine'], format=config['format'])
            if 'Save Nodes' in do and do['Save Nodes']:
                print('Save Nodes has been replaced with '
                      'ConveyorNode.to_json. Call api.py instead.')
        if 'Graph' in do:
            print('Can no longer load nodes.')


def main_cli():
    parser = argparse.ArgumentParser(description='Calculate Satisfactory '
                                                 'Splitters and Graph Them.',
                                     parents=[api.create_arg_parser()],
                                     conflict_handler='resolve')

    graph = parser.add_argument_group('Graphviz')
    graph.add_argument('-e', '--engine', type=str, default='dot',
                       help='Output layout engine. (How everything looks) '
                            'https://graphviz.org/docs/layouts/')
    graph.add_argument('-f', '--format', type=str, default='pdf',
                       help='Output file type. '
                            'https://graphviz.org/docs/outputs/')
    graph.add_argument('-l', '--lines',
                       default='ortho', dest='lines',
                       choices=['none', 'line', 'polyline',
                                'curved', 'ortho', 'spline'],
                       help='Style to draw lines. '
                            'https://graphviz.org/docs/attrs/splines/')
    parser.add_argument('--to-file', type=str, default='splitters',
                        help='Filename to save to (w/o extension)')

    args = parser.parse_args()
    if any([i <= 0 for i in args.into]):
        raise ValueError(f'Inputs must be greater than 0')

    if args.lines != GRAPH_ATTR['splines']:
        GRAPH_ATTR['splines'] = args.lines

    args_copy = vars(args).copy()
    del args_copy['into']
    del args_copy['to_file']
    del args_copy['lines']
    output = api.main_base(*itemgetter('into', 'belts', 'mk', 'max_split',
                                       'max_merge')(vars(args)))
    quick_graph(args.to_file, output['start'],
                engine=args.engine, format=args.format,
                graph_attr={**GRAPH_ATTR, 'splines': args.lines})


if __name__ == '__main__':

    if len(argv) > 1 and argv[1].endswith(('.json', 'yaml')):
        main_file(argv[1])
    else:
        main_cli()
