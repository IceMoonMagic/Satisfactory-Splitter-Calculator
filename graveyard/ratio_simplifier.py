import decimal
import math

import graphviz as gv

SHAPE = {'dst': 'Msquare', 'split': 'diamond', 'merge': 'Mdiamond'}


def format_float(num, max_dec=4, raw=False):
    fixed = f'{num:.{max_dec}f}'.rstrip('0').rstrip('.')
    if raw:
        if '.' in fixed:
            return float(fixed)
        return int(fixed)
    return fixed


def ratio(*args):
    out = list(args)

    # Determine how to simplify to all integers
    decimals = 0
    for r in args:
        t = decimal.Decimal(str(r)).as_tuple().exponent
        decimals = t if t < decimals else decimals
    decimals *= -1  # abs(decimals)
    if decimals < 0:
        raise RuntimeError(f'`decimals` somehow ended up negative, {args}')

    # Multiplies all args to keep ratio but make ints
    for i, r in enumerate(args):
        out[i] = int(r * (10 ** decimals))

    # Calculate the greatest common factory and divide everything by it.
    divide = math.gcd(*out)
    for i, r in enumerate(out):
        out[i] = r // divide
    return out


# def smart_ratio(*args):
#     out = list(args)
#     for arg in args:
#         if


def split(into: int, back: int = 0):
    if into < 2:
        raise ValueError(f'Input must be greater than 1')
    if into in {2, 3}:
        return tuple(([-1] * back) + [1] * (into - back))
    if into % 2 == 0:
        return split(into // 2, back), split(into // 2)
    if into % 3 == 0:
        return split(into // 3, back), split(into // 3), split(into // 3)
    return split((into + 1), back + 1)


def print_splitters(src: str):
    import yaml
    print(yaml.dump(src).replace('!!python/tuple', 'splitter'))


def print_split(into: int):
    print_splitters(split(into))


def graph_split(into: int, source=None, graph=None, parent=None, name=None,
                back=None):
    if into < 2:
        raise ValueError(f'Input must be greater than 1')

    root = None in {graph, parent}

    if graph is None:
        graph = gv.Digraph(f'Split {into}',
                           engine='dot',
                           node_attr={'shape': 'box'})
    if parent is None:
        parent = ''
    name = name if name else parent + str(into)
    source = source if source else into

    if not (name.endswith('r') or name.endswith('n')) \
            or back is None:
        back = []

    graph.node(name, format_float(source))
    if not root:
        graph.edge(parent, name)
        # graph.edge(parent, f'{name}:n')

    if into in {2, 3}:
        target = into - len(back)
        for i in range(target):
            graph.node(name + str(i), format_float(source / into))
            graph.edge(name, name + str(i))
        for i in back:
            graph.edge(name, i)
            # graph.edge(name, i, format_float(source/into))
        return
    for s in [2, 3]:
        if into % s == 0:
            for i in ['l', 'r', 'm'][:s]:
                graph_split(into // s, source / s, graph, name, name + i, back)
            return
    back.append(name)
    graph_split(into + 1, source + (source / into), graph, name, name + 'n',
                back)


def graph_ratio_primer(targets: list, graph: gv.Digraph, into: int = None,
                       source=None):
    if into is None:
        into = sum(targets)
    if into < 2:
        raise ValueError(f'Input must be greater than 1 | {targets} | {into}')
    targets = {t: None for t in targets}

    targets, back, ends = _graph_ratio(
        graph=graph, targets=targets, back=[], ends=[],
        into=into, parent='', name=str(into),
        source=source if source else into, root=True
    )
    # for target in targets:
    #     # ToDo: Find nearest end node
    #     for t in range(target):
    #         graph.edge(ends.pop(), targets[target])


def _graph_ratio(graph, targets: dict, back: list, ends: list, into: int,
                 parent: str, name: str, source: float, *, root=False):
    if None in [targets, into, source, graph, parent, name]:
        raise ValueError('A parameter has been left unfilled')
    if into < 2:
        # if into == 1:
        #     ends.append(name)
        #     return [targets, back, ends]
        raise ValueError(f'Input must be greater than 1 | {targets} | {into}')

    if not (name.endswith('l') or name.endswith('n')) \
            or back is None:
        print('deleting back', name, back)
        back = []

    have_node = False

    def self_node(shape=SHAPE['split']):
        nonlocal have_node
        if not have_node:
            have_node = True
            graph.node(name, format_float(source), shape=shape)
            if not root:
                graph.edge(parent, name)
            # graph.edge(parent, f'{name}:n')

    actual = into - len(back)

    # Determine how to split
    for s in [2, 3]:
        new_names = ['l', 'r', 'm'][:s]
        flag = False

        def safe(name_iter):
            if len(back) == 0:
                return True
            if not isinstance(name_iter, set):
                name_iter = {name_iter}
            return new_names[0] not in name_iter

        # If merging part of the split will make target
        test = lambda: (into / s) * 2 in targets
        if test():
            print('merge')
            flag = True
            for i, j in zip(reversed(new_names[0::2]),
                            reversed(new_names[1::2])):
                if test() and safe({i, j}):
                    self_node()
                    graph.node(name + i + j, format_float((source / s) * 2),
                               shape=SHAPE['merge'])
                    graph.edge(name, name + i + j)
                    graph.edge(name, name + i + j)
                    if targets[(into / s) * 2] is not None:
                        graph.edge(name + i + j, targets[(into / s) * 2],
                                   format_float((source / s) * 2))
                    else:
                        graph.node(name + i + j + new_names[0],
                                   format_float((source / s) * 2),
                                   shape=SHAPE['dst'])
                        graph.edge(name + i + j, name + i + j + new_names[0])
                    del targets[(into / s) * 2]
                    new_names.remove(i)
                    new_names.remove(j)
                else:
                    break

        # If an output will be smaller than a target
        test = lambda: any(into / s < t for t in targets)
        if into % s == 0 and test():
            print('small', targets, into, s)
            flag = True
            for i in reversed(new_names):
                if test() and safe(i):
                    self_node()
                    t = next(t for t in targets if into / s < t)
                    if targets[t] is not None:
                        graph.edge(name, targets[t], format_float(source / s))
                    else:
                        graph.node(name + i, format_float(t * (source / into)),
                                   shape=SHAPE['merge'])
                        graph.edge(name, name + i, format_float(source / s))
                        graph.node(name + i + new_names[0],
                                   format_float(t * (source / into)),
                                   shape=SHAPE['dst'])
                        graph.edge(name + i, name + i + new_names[0])
                    targets[t - (into / s)] = targets[t] if targets[
                        t] else name + i
                    del targets[t]
                    new_names.remove(i)
                else:
                    break

        # If an output will make a target
        test = lambda: into / s in targets
        if test():
            print('equal', targets, into, s)
            flag = True
            for i in reversed(new_names):
                if test() and safe(i):
                    self_node()
                    if targets[into / s] is not None:
                        graph.edge(name, targets[into / s],
                                   format_float(source / s))
                    else:
                        graph.node(name + i, format_float(source / s),
                                   shape=SHAPE['dst'])
                        graph.edge(name, name + i)
                    del targets[into / s]
                    new_names.remove(i)
                else:
                    break

        del test
        # [Base Case]
        # print(into, s, targets)
        if into == s:
            print('base', new_names, new_names[:-len(back)])
            self_node()
            for i, _ in zip(range(actual), new_names[:-len(back)]):
                graph.node(name + str(i), format_float(source / into),
                           shape=SHAPE['dst'])
                graph.edge(name, name + str(i))
            for i in back:
                graph.edge(name, i)
            return [targets, back, ends]

        # If this splits nicely or already splitting
        if into % s == 0 or flag:
            print('nice', targets)
            self_node()
            for i in new_names:
                _graph_ratio(graph, targets, back, ends, into // s, name,
                             name + i, source / s)
            return [targets, back, ends]

    # If none of that worked
    print('increase')
    self_node(SHAPE['merge'])
    back.append(name)
    _graph_ratio(graph, targets, back, ends, into + 1, name, name + 'n',
                 source + (source / into))


def gen_speed(op_rate: float):
    return 100 * (op_rate / 100) ** 1.3


def main(x=8, src=None, view=True):
    src = src if src else x
    graph = make_graph(f'Split {src} into {x}')
    graph_split(x, src, graph)
    if view:
        graph.view()
    return graph


def main_ratio(r, src: int = None, view=True):
    src = src if src else sum(r)
    graph = make_graph(
        f'Ratio {src} to {tuple(format_float((src / sum(r)) * i, raw=True) for i in r)}')
    graph_ratio_primer(r, source=src, graph=graph)
    if view:
        graph.view()
    return graph


def make_graph(name: str, engine: str = 'dot',
               graph_attr: dict = None, directory: str = r'/tmp/ratio',
               **kwargs) -> gv.Digraph:
    if graph_attr is not None:
        graph_attr = {'splines': 'ortho', **graph_attr}
    else:
        graph_attr = {'splines': 'ortho'}
    return gv.Digraph(name, engine=engine, graph_attr=graph_attr,
                      directory=directory, **kwargs)


def ratio_main(*args, src=None, **kwargs):
    src = src if src else sum(args)
    targets = ratio(*args)
    print(f'{src} | {targets}')
    return main_ratio(targets, src, **kwargs)


def weird_set():
    return {13, 19, 23, 29}


if __name__ == '__main__':
    while(True):
        try:
            exec(input())
        except Exception as e:
            print(e)
