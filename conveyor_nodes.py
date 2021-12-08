import decimal
import math
from typing import Union, List, Dict, Set, Tuple
from operator import itemgetter
from sys import argv

import graphviz as gv  # https://pypi.org/project/graphviz/
import yaml  # https://pypi.org/project/PyYAML/

ENGINE = 'dot'
FORMAT = 'pdf'
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
MAX_MERGE = MAX_SPLIT = 3
LIMIT_MERGING = False
BELTS = [60, 120, 270, 480, 780]
MK = 5
DIRECTORY = r'/tmp/ratio'


class ConveyorNode(yaml.YAMLObject):
    yaml_tag = u'!LogisticNode'
    yaml_loader = yaml.YAMLObject.yaml_loader + [yaml.SafeLoader]
    yaml_dumper = yaml.SafeDumper

    DECIMALS = 4

    def __init__(self, holding: float = 0, display_multi: float = 1, *,
                 display: str = None):
        self.display = display
        self.multi = display_multi
        self.holding = holding

        '''Form: {Other Node: 
                    {Transfer Rate: Num of Links w/ Transfer Rate}}'''
        self.ins = {}
        self.outs = {}

    def __str__(self) -> str:
        if self.display is not None:
            return self.display
        else:
            return format_float(self.holding * self.multi)

    def __repr__(self) -> str:
        return f'{self.in_links} -> {self.out_links}, {self.holding}' \
               f' | {id(self)}'

    def link_from(self, src: "ConveyorNode", carrying: float = None):
        self.link(src, self, carrying)

    def unlink_from(self, src: "ConveyorNode", carrying: float = None):
        self.unlink(src, self, carrying)

    def unlink_from_all(self):
        for src, links in self.ins.copy().items():
            for carrying, count in links.copy().items():
                for _ in range(count):
                    self.unlink_from(src, carrying)

    def link_to(self, dst: "ConveyorNode", carrying: float = None):
        self.link(self, dst, carrying)

    def unlink_to(self, dst: "ConveyorNode", carrying: float = None):
        self.unlink(self, dst, carrying)

    def unlink_to_all(self):
        for dst, links in self.outs.copy().items():
            for carrying, count in links.copy().items():
                for _ in range(count):
                    self.unlink_to(dst, carrying)

    @staticmethod
    def link(src: "ConveyorNode", dst: "ConveyorNode", carrying: float = None):
        """Make a link from src to dst with given a carry rate."""
        carrying = carrying if carrying is not None else src.splittable
        # If there are no connections between src and dst
        if dst not in src.outs:
            src.outs[dst] = {carrying: 1}
            dst.ins[src] = src.outs[dst]
        # If there is a connection but not with `carrying`
        elif carrying not in src.outs[dst]:
            src.outs[dst] = {carrying: 1}
        else:
            src.outs[dst][carrying] += 1

        # Adjust each node's holding value
        src.holding -= carrying
        dst.holding += carrying

    @staticmethod
    def unlink(src: "ConveyorNode", dst: "ConveyorNode",
               carrying: float = None):
        """Remove a link from src to dst with given a carry rate."""
        if dst not in src.outs:
            raise ValueError(f'`src` and `dst` are not linked.')
        if carrying not in src.outs[dst] and carrying is not None:
            raise ValueError(f'`src` and `dst` are not linked '
                             f'with a load of  {carrying}.')

        # Auto selects `carrying` if there is only one viable option.
        if carrying is None and len(src.outs[dst]) == 1:
            carrying = next(iter(src.outs[dst]))
        elif carrying is None:
            raise ValueError('More than one rate between `src` and `dst`, '
                             'can not default.')

        # Decrease count of connection at rate
        src.outs[dst][carrying] -= 1
        # dst.ins[src][carrying] -= 1
        # If was that was the last connection at rate, remove
        if src.outs[dst][carrying] <= 0:
            del src.outs[dst][carrying]
        # If no more connections between the two, remove from each other
        if len(src.outs[dst]) == 0:
            del src.outs[dst]
            del dst.ins[src]

        # Adjust each node's holding value
        src.holding += carrying
        dst.holding -= carrying

    @staticmethod
    def links_str(connections: dict, indent: int = 0) -> str:
        string = ''
        upper_indent = '\t' * indent
        lower_indent = upper_indent + '\t'
        for node, links in connections.items():
            string += f'{upper_indent}{node}:\n'
            for carrying, num_of_links in links.items():
                string += f'{lower_indent}{format_float(carrying)} (' \
                          f'{num_of_links} times)'
        return string

    @staticmethod
    def _sum_connections(foo: dict, factor_carrying: bool = False):
        total = 0
        for _node, links in foo.items():
            for carrying, num_of_links in links.items():
                if factor_carrying:
                    total += num_of_links * carrying
                else:
                    total += num_of_links
        return total

    @property
    def in_links(self) -> int:
        """Number of connected, incoming, links."""
        return self._sum_connections(self.ins)

    @property
    def out_links(self) -> int:
        """Number of connected, outgoing, links."""
        return self._sum_connections(self.outs)

    @property
    def sum_ins(self) -> float:
        return self._sum_connections(self.ins, True)

    @property
    def sum_outs(self) -> float:
        return self._sum_connections(self.outs, True)

    @property
    def splits_evenly(self) -> bool:
        target = self.sum_outs / self.out_links
        for out in self.outs.values():
            for amount in out:
                if target != amount:
                    return False
        return True

    @property
    def splittable(self) -> float:
        if self.out_links > 0:
            links = next(iter(self.outs.values()))
            return next(iter(links))
        return self.holding

    def split_into(self, r) -> float:
        if self.holding == 0:
            return 0
        if self.out_links > 0:
            return self.splittable
        return self.holding / r

    @property
    def id(self) -> str:
        return str(id(self))


def format_float(num, max_dec=4) -> str:
    return f'{num:.{max_dec}f}'.rstrip('0').rstrip('.')


def to_fraction(value: Union[int, List[int], Tuple[int]]) -> List[int]:
    """Standardizes the numbers into a [numerator, denominator] 'fraction'."""
    if isinstance(value, int):
        return [value, 1]
    elif isinstance(value, float):
        print('This may not end well...')
        # Will likely cause a ratio of obscene size, which will eventually fail
        # due to a recursion error.
        return list(value.as_integer_ratio())
    elif not isinstance(value, (tuple, list)):
        raise TypeError('Targets should an int, float, or tuple/list of 1 to '
                        f'3 elements, got {type(value)}.')
    elements = len(value)
    if elements == 1:
        return [value[0], 1]
    elif elements == 2:
        return list(value)
    elif elements == 3:
        whole = value[0]
        num = value[1]
        den = value[2]
        return [whole * den + num, den]
    else:
        raise ValueError('Targets should an int, float, or tuple/list of 1 to '
                         f'3 elements, got {elements}.')


def from_fraction(value: Union[int, float, List[int], Tuple[int]]) -> float:
    """Returns the actual value of the 'fraction' that was given."""
    if isinstance(value, (int, float)):
        return value
    elif not isinstance(value, (tuple, list)):
        raise TypeError('Targets should an int or tuple/list of 1 to '
                        f'3 elements, got {type(value)}.')
    elements = len(value)
    if elements == 1:
        return value[0]
    elif elements == 2:
        return value[0] / value[1]
    elif elements == 3:
        whole = value[0]
        num = value[1]
        den = value[2]
        return whole + (num / den)
    else:
        raise ValueError('Targets should an int, float, or tuple/list of 1 to '
                         f'3 elements, got {elements}.')


def ratio(*targets: Union[float, int]) -> List[int]:
    """Simplifies the targets into integers, keeping the given ratio."""
    out = list(targets)

    # Determine how to simplify to all integers
    decimals = 0
    for r in targets:
        t = decimal.Decimal(str(r)).as_tuple().exponent
        decimals = t if t < decimals else decimals
    decimals *= -1  # abs(decimals)
    if decimals < 0:
        raise RuntimeError(f'`decimals` somehow ended up negative, {targets}')

    # Multiplies all args to keep ratio but make ints
    for i, r in enumerate(targets):
        out[i] = int(r * (10 ** decimals))

    # Calculate the greatest common factory and divide everything by it.
    divide = math.gcd(*out)
    for i, r in enumerate(out):
        out[i] = r // divide
    return out


def fraction_ratio(*targets: Union[int, List[int], Tuple[int]],
                   fractions_done: bool = False) -> List[int]:
    #  --- Set Up Fractions ---
    fractions = []  # [[Numerator, Denominator], [...], ...]
    if fractions_done:
        fractions = list(targets)
    else:
        for fraction in targets:
            fractions.append(to_fraction(fraction))

    #  --- Calculate Least Common Denominator ---
    lcd = math.lcm(*[f[1] for f in fractions])

    #  --- Adjust Factions Based on LCD ---
    for fraction in fractions:
        by = lcd // fraction[1]
        fraction[0] *= by
        fraction[1] *= by
    # - Validate -
    validate = [f[1] for f in fractions]
    if any(v != validate[0] for v in validate):
        raise ValueError(f'Denominators not the same. {validate}')

    # --- Calculate Greatest Common Factor ---
    gcf = math.gcd(*[f[0] for f in fractions])

    # --- Simplify ---
    for fraction in fractions:
        fraction[0] //= gcf

    # --- Return ---
    return [f[0] for f in fractions]


def smart_ratio(*targets: int, mk: int = 5, alt_belts: list = None) -> \
        Dict[str, List[float]]:
    """
    Tries to find the best ratio by removing full belts beforehand.

    :param targets: What the desired outputs are.
    :param mk: Highest available MK of belt in (from base game).
    :param alt_belts: Allows custom belt removal amounts. Overrides mk.
    :return: dict with calculated targets, ratio, and how to get them.
    """
    belts = alt_belts.sort() if alt_belts else [60, 120, 270, 480, 780][:mk]

    '''Best way to simplify the ratio, defaults to doing nothing'''
    '''The raw values being ratio-ed'''
    best_targets = list(targets)
    '''Simplified ratio by going through ratio()'''
    best_ratio = ratio(*targets)
    '''Lower is better, sum of output from ratio() with additional penalty'''
    best_score = sum(best_ratio)
    '''How to subtract from each each out to get the best ratio.'''
    best_splits = [[] for _ in targets]

    def _smart_ratio(new_targets: list, divider: int,
                     new_splits: list, penalty: int):
        """Should test every combination of removing a full belt for ratios."""
        nonlocal best_targets, best_ratio, best_score, best_splits
        for belt in belts:
            if new_targets[divider] >= belt:
                # --- Setup Test Variables ---
                # Record how much is removed
                test_splits = [i.copy() for i in new_splits]  # needs deep copy
                test_splits[divider].append(belt)
                # Remove from belt
                test_targets = new_targets.copy()
                test_targets[divider] -= belt

                # --- Test Ratio ---
                if sum(test_targets) != 0:
                    test_ratio = ratio(*test_targets)
                else:
                    test_ratio = [0] * len(test_targets)
                    penalty -= 1
                test_score = sum(test_ratio) + ((penalty + 1) // 2 * 2)
                # Replace Best variables if better
                if test_score < best_score:
                    best_targets = test_targets
                    best_ratio = test_ratio
                    best_score = test_score
                    best_splits = [i.copy() for i in test_splits]

                # Try removing more, then try removing a different amount
                _smart_ratio(test_targets, divider, test_splits, penalty + 1)
            else:
                break
        if divider + 1 < len(new_targets):
            # Move on to the next output
            _smart_ratio(new_targets, divider + 1, new_splits, penalty)

    # Calculate
    _smart_ratio(list(targets), 0, best_splits, 0)

    # Output
    return {'remove': best_splits, 'targets': best_targets,
            'ratio': best_ratio}


def fraction_smart_ratio(*targets: Union[int, List[int], Tuple[int]],
                         mk: int = 5, alt_belts: list = None) -> \
        Dict[str, List[float]]:
    #  --- Set Up Fractions ---
    fractions = []
    for fraction in targets:
        fractions.append(to_fraction(fraction))

    #  --- Set Up Additional Variables ---
    belts = alt_belts.sort() if alt_belts else [60, 120, 270, 480, 780][:mk]

    '''Best way to simplify the ratio, defaults to doing nothing'''
    '''The raw values being ratio-ed'''
    best_targets = list(fractions)
    '''Simplified ratio by going through ratio()'''
    best_ratio = fraction_ratio(*fractions, fractions_done=True)
    '''Lower is better, sum of output from ratio() with additional penalty'''
    best_score = sum(best_ratio)
    '''How to subtract from each each out to get the best ratio.'''
    best_splits = [[] for _ in fractions]

    # --- Recursive Function ---
    def _smart_ratio(new_targets: list, divider: int,
                     new_splits: list, penalty: int):
        """Should test every combination of removing a full belt for ratios."""
        nonlocal best_targets, best_ratio, best_score, best_splits
        for belt in belts:
            if new_targets[divider][0] / new_targets[divider][1] >= belt:
                # --- Setup Test Variables ---
                # Record how much is removed
                test_splits = [i.copy() for i in new_splits]  # needs deep copy
                test_splits[divider].append(belt)
                # Remove from belt
                test_targets = [i.copy() for i in new_targets]
                test_targets[divider][0] -= belt * test_targets[divider][1]

                # --- Test Ratio ---
                if sum([i[0] for i in test_targets]) != 0:
                    test_ratio = fraction_ratio(*test_targets,
                                                fractions_done=True)
                else:
                    test_ratio = [0] * len(test_targets)
                    penalty -= 1
                test_score = sum(test_ratio) + ((penalty + 1) // 2 * 2)
                # Replace Best variables if better
                if test_score < best_score:
                    best_targets = test_targets
                    best_ratio = test_ratio
                    best_score = test_score
                    best_splits = [i.copy() for i in test_splits]

                # Try removing more, then try removing a different amount
                _smart_ratio(test_targets, divider, test_splits, penalty + 1)
            else:
                break
        if divider + 1 < len(new_targets):
            # Move on to the next output
            _smart_ratio(new_targets, divider + 1, new_splits, penalty)

    # --- Start Recursive Function ---
    _smart_ratio(list(fractions), 0, best_splits, 0)

    # --- Return ---
    return {'remove': best_splits, 'targets': best_targets,
            'ratio': best_ratio}


def even_split(root_node: ConveyorNode, out_amount: int) -> List[ConveyorNode]:
    near_nodes = []
    multiplier = root_node.holding / out_amount

    def _split(node: ConveyorNode, into: int, back: List[ConveyorNode]):
        if into < 2:
            raise ValueError(f'Input must be greater than 1')
        if into in {2, 3}:
            target = into - len(back)
            for i in range(target):
                new_node = ConveyorNode()
                node.link_to(new_node, node.split_into(into))
                near_nodes.append(new_node)
            for i in back:
                node.link_to(i, node.split_into(into))
            return
        for s in [2, 3]:
            if into % s == 0:
                for i in range(s):
                    new_node = ConveyorNode()
                    node.link_to(new_node, node.split_into(s))
                    _split(new_node, into // s, back if i == 0 else [])
                return
        else:
            back.append(node)
            new_node = ConveyorNode()
            node.link_to(new_node, node.holding + multiplier)
            _split(new_node, into + 1, back)

    _split(root_node, out_amount, [])
    return near_nodes


def even_merge(end_nodes: List[ConveyorNode], into: List[int],
               respect_order: bool = False) -> List[ConveyorNode]:
    # if len(end_nodes) != sum(into):
    #     raise ValueError(f'{len(end_nodes)} != {sum(into)}')
    if not respect_order:
        into.sort()
    ends = []

    def _merge(remaining_nodes: List[ConveyorNode], max_merge=3) \
            -> ConveyorNode:
        to_node = ConveyorNode()
        for _ in zip(remaining_nodes.copy(), range(max_merge)):
            remaining_nodes.pop(0).link_to(to_node)
        if len(remaining_nodes) > 0:
            remaining_nodes.append(to_node)
            return _merge(remaining_nodes, max_merge)
        return to_node

    for i, _ in enumerate(into):
        ends.append(_merge(end_nodes[sum(into[:i]):sum(into[:i + 1])]))
    return ends


def smart_split(root_node: ConveyorNode, remove_splits: List[List[float]],
                end_ratio: List[int]):
    new_root = root_node
    simp_nodes = []
    for remove in remove_splits:
        these_nodes = []
        next_out = None
        for i, r in enumerate(remove):
            if i % (MAX_SPLIT - 1) == 0:
                next_out = ConveyorNode()
            new_root.link_to(next_out, r)
            if i % (MAX_SPLIT - 1) == 0 or i == len(remove) - 1:
                next_root = ConveyorNode()
                new_root.link_to(next_root, new_root.holding)
                new_root = next_root
                these_nodes.append(next_out)
        if len(these_nodes) == 0:
            simp_nodes.append(ConveyorNode())
        elif len(these_nodes) == 1:
            simp_nodes.append(these_nodes[0])
        else:
            merger = ConveyorNode()
            for node in these_nodes:
                merger.link_from(node)
            simp_nodes.append(merger)

    if sum(end_ratio) > 1:
        out_nodes = even_split(new_root, sum(end_ratio))
        out_nodes = even_merge(out_nodes, end_ratio, True)
        if len(simp_nodes) != len(out_nodes):
            raise ValueError
        for true_out, almost_out in zip(simp_nodes, out_nodes):
            true_out.link_from(almost_out)


def simplify_graph(start_nodes: Set[ConveyorNode]) \
        -> Dict[str, Set[ConveyorNode]]:
    def island(node: ConveyorNode):
        if node.holding != 0:
            key_nodes['islands'].add(node)
        else:
            key_nodes['removed'].add(node)

    def source_splitter(node: ConveyorNode):
        output = node.sum_outs
        from_node = ConveyorNode(output)
        node.link_from(from_node)
        node.holding -= output

    def pass_through(node: ConveyorNode):
        src_node = next(iter(node.ins))
        dst_node = next(iter(node.outs))

        relink = node.sum_outs

        while node in dst_node.ins:
            node.unlink_to(dst_node, next(iter(node.outs[dst_node])))
        while node in src_node.outs:
            node.unlink_from(src_node, next(iter(node.ins[src_node])))

        src_node.link_to(dst_node, relink)
        key_nodes['removed'].add(node)
        if node.holding != 0:
            print('removed a node that was holding something...')

    def merge_dst(node: ConveyorNode):
        to_node = ConveyorNode()
        node.link_to(to_node)
        key_nodes['end'].add(to_node)

    def merge_split(node: ConveyorNode):
        to_node = ConveyorNode()
        remove = []
        for dst_node, links in node.outs.items():
            for carrying, count in links.items():
                for _ in range(count):
                    to_node.link_to(dst_node, carrying)
                    remove.append((dst_node, carrying))
        for dst_node, carrying in remove:
            dst_node.unlink_from(node, carrying)

    def source(node: ConveyorNode):
        key_nodes['start'].add(node)

    def destination(node: ConveyorNode):
        key_nodes['end'].add(node)

    key_nodes = {'start': start_nodes, 'end': set(),
                 'islands': set(), 'removed': set()}

    seen_nodes = set()

    operations = {(0, 0): island,
                  (0, 1): source,
                  (0, 2): source_splitter,
                  (1, 0): destination,
                  (1, 1): pass_through,
                  # (1, 2): splitter,
                  (2, 0): merge_dst,
                  # (2, 1): merger,
                  (2, 2): merge_split}

    done = False

    def _simplify(curr_node):
        if curr_node in seen_nodes:
            return
        seen_nodes.add(curr_node)

        node_type = (min(len(curr_node.ins), 2),
                     min(len(curr_node.outs), 2))
        if node_type in operations:
            operations[node_type](curr_node)
            if node_type not in {(1, 0), (0, 1)}:
                nonlocal done
                done = False

        for dst_node in curr_node.outs.copy():
            _simplify(dst_node)

    def cut_excess(my_node: ConveyorNode):
        cut_nodes = {}

        def _cut_excess(node: ConveyorNode, traced: Set[ConveyorNode]):
            def scan_excess(curr_node: ConveyorNode,
                            trace: Set[ConveyorNode]) \
                    -> List[Union[Set[ConveyorNode], Tuple[ConveyorNode]]]:
                if curr_node.out_links == 0:
                    return [{curr_node}, set()]
                if curr_node in trace:
                    # if curr_node is node:
                    #     return [set(), set()]
                    return [set(), set()]
                child = [set(), set()]
                trace.add(curr_node)
                for link_node in curr_node.outs:
                    if link_node is node:
                        child[1] |= {(curr_node, node)}
                        continue
                    child_notes = scan_excess(link_node, trace)
                    child[0] |= child_notes[0]
                    child[1] |= child_notes[1]
                trace.remove(curr_node)
                return child

            if node in traced:
                return

            children = set()
            recurse_cut = set()
            for linked_node in node.outs:
                children_notes = scan_excess(linked_node, {node})
                children |= children_notes[0]
                recurse_cut |= children_notes[1]
            if len(children) != 1:
                traced.add(node)
                for linked_node in node.outs:
                    _cut_excess(linked_node, traced)
                traced.remove(node)
                return

            nonlocal cut_nodes
            for unlink_src, unlink_dst in recurse_cut:
                if unlink_dst is not node:
                    raise ValueError
                node.unlink_from(unlink_src)
            only_child = next(iter(children))
            if only_child not in cut_nodes:
                cut_nodes[only_child] = set()
            cut_nodes[only_child].add(node)
            return

        for out_node in my_node.outs:
            _cut_excess(out_node, {my_node})

        nonlocal done
        done = False
        for dst_node, src_nodes in cut_nodes.items():
            dst_node.unlink_from_all()
            for src_node in src_nodes:
                src_node.unlink_to_all()
                src_node.link_to(dst_node)

    while not done:
        cut_excess(next(iter(start_nodes)))
        while not done:
            done = True
            for start_node in start_nodes:
                _simplify(start_node)
            seen_nodes.clear()

    return key_nodes


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

    def _graph_nodes(curr_node: ConveyorNode):
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


if __name__ == '__main__':
    def make_nodes(*holdings, **kwargs) -> Set['ConveyorNode']:
        return {ConveyorNode(holding=h, **kwargs) for h in holdings}


    def quick_graph(name: str, nodes: set, view=True):
        """Simple function to quickly graph nodes and catches ortho issues."""
        my_graph = make_graph(name)
        graph_nodes(my_graph, nodes)
        if view:
            try:
                my_graph.view()
            # This is when ortho lines become unhappy for some reason
            except gv.backend.execute.CalledProcessError:
                my_graph = make_graph(name, graph_attr={'splines': 'polyline'})
                graph_nodes(my_graph, nodes)
                my_graph.view()
                return my_graph
        return my_graph


    def make_graph(name: str, engine: str = None,
                   graph_attr: dict = None, directory: str = None,
                   format_: str = None, **kwargs) -> gv.Digraph:
        engine = engine if engine else ENGINE
        if graph_attr is not None:
            graph_attr = {'splines': 'ortho', **graph_attr}
        else:
            graph_attr = {'splines': 'ortho'}
        directory = directory if directory else DIRECTORY
        format_ = format_ if format_ else FORMAT
        return gv.Digraph(name, engine=engine, graph_attr=graph_attr,
                          directory=directory, format=format_, **kwargs)


    def main(*num: Union[int, Tuple[int]], name: str = 'foo',
             view: bool = True, simplify: bool = True):
        if num is None:
            raise ValueError('No value(s) given for num.')

        # targets = smart_ratio(*num)['ratio']
        root_node = make_nodes(sum([from_fraction(n) for n in num])).pop()
        to_node = ConveyorNode()
        to_node.link_from(root_node)

        if len(num) > 1:
            remove, ratio_ = itemgetter('remove', 'ratio')(
                fraction_smart_ratio(*num))
            smart_split(to_node, remove, ratio_)

            # Uncomment below to see what it looks like before simplifying.
            # quick_graph(f'{name}pre', {root_node}, view)
        elif len(num) == 1:
            if isinstance(num[0], float):
                try:
                    even_split(to_node, int(format_float(num[0])))
                except ValueError:
                    raise TypeError(
                        f'If only one value is provided, it has to be an '
                        f'int, got {num[0]}, which could not be cast to an '
                        f'int without loosing {num[0]-int(num[0])}.)')
            elif isinstance(num[0], int):
                even_split(to_node, num[0])
            else:
                raise TypeError('If only one value is provided, '
                                f'it has to be an int, got {type(num[0])}')

        if simplify:
            _jic = simplify_graph({root_node})

        return quick_graph(name, {root_node}, view), root_node


    def main_yaml(yaml_file):
        with open(yaml_file) as file:
            settings = yaml.safe_load_all(file)

            config = next(settings)
            global MAX_MERGE, MAX_SPLIT
            MAX_MERGE, MAX_SPLIT = config['MAX_MERGE'], config['MAX_SPLIT']
            global ENGINE
            ENGINE = config['ENGINE']
            global FORMAT
            FORMAT = config['FORMAT']
            global NODE_ATTR
            NODE_ATTR = config['NODE_ATTR']
            global GRAPH_ATTR
            GRAPH_ATTR = config['GRAPH_ATTR']
            global BELTS, MK
            BELTS, MK = config['BELTS'], config['MK']
            global DIRECTORY
            DIRECTORY = config['DIRECTORY']

            do = next(settings)
            if 'Calculate' in do:
                try:
                    calc = list(next(settings))
                except TypeError:
                    raise ValueError('YAML has nothing to calculate.')
                root_node = main(*calc, name=do['Calculate'])[1]
                if 'Save Nodes' in do and do['Save Nodes']:
                    save_to = ''
                    if DIRECTORY != '':
                        save_to = DIRECTORY.rstrip('/') + '/'
                    new_do = do.copy()
                    del new_do['Calculate']
                    if 'Graph' not in new_do:
                        new_do['Graph'] = do['Calculate']
                    with open(f'{save_to}{do["Calculate"]}.yaml',
                              'w+') as save_file:
                        yaml.safe_dump_all(
                            [config, new_do, root_node], save_file)
            if 'Graph' in do:
                quick_graph(do['Graph'], set(settings))


    if len(argv) > 1:
        main_yaml(argv[1])
