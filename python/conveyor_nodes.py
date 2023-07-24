import math
from fractions import Fraction
from sys import argv
from typing import List, Dict, Sequence, Set, Tuple


class ConveyorNode:
    NODE_TYPES = {(0, 0): 'Island',
                  (0, 1): 'Source',
                  (0, 2): 'Source Splitter',
                  (1, 0): 'Destination',
                  (1, 1): 'Pass Through',
                  (1, 2): 'Splitter',
                  (2, 0): 'Merger Destination',
                  (2, 1): 'Merger',
                  (2, 2): 'Merge Splitter'}

    def __init__(self, holding: Fraction = 0):
        # self.display = display
        # self.multi = display_multi
        self.holding = holding

        '''Form: {Other Node: 
                    {Transfer Rate: Num of Links w/ Transfer Rate}}'''
        self.ins = {}
        self.outs = {}
        self.depth = 0

    def link_to(self, dst: "ConveyorNode", carrying: Fraction = None):
        self.link(self, dst, carrying)

    def unlink_to(self, dst: "ConveyorNode", carrying: Fraction = None):
        self.unlink(self, dst, carrying)

    def unlink_to_all(self):
        for dst, links in self.outs.copy().items():
            for carrying, count in links.copy().items():
                for _ in range(count):
                    self.unlink(self, dst, carrying)

    def unlink_from_all(self):
        for src, links in self.ins.copy().items():
            for carrying, count in links.copy().items():
                for _ in range(count):
                    self.unlink(src, self, carrying)

    @staticmethod
    def link(src: "ConveyorNode", dst: "ConveyorNode",
             carrying: Fraction = None):
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

        # Adjust dst node's depth
        if dst.in_links <= 1:
            dst.depth = src.depth + 1
        else:
            dst.depth = min(src.depth + 1, dst.depth)

    @staticmethod
    def unlink(src: "ConveyorNode", dst: "ConveyorNode",
               carrying: Fraction = None):
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

        # Adjust dst node's depth
        if dst.depth == src.depth + 1:
            if dst.in_links > 0:
                dst.depth = min([in_node.depth + 1 for in_node in dst.ins])
            else:
                dst.depth = 0
                # print('doubtful', dst.in_links)

    # @staticmethod
    # def links_str(connections: dict, indent: int = 0) -> str:
    #     string = ''
    #     upper_indent = '\t' * indent
    #     lower_indent = upper_indent + '\t'
    #     for node, links in connections.items():
    #         string += f'{upper_indent}{node}:\n'
    #         for carrying, num_of_links in links.items():
    #             string += f'{lower_indent}{format_float(carrying)} (' \
    #                       f'{num_of_links} times)'
    #     return string

    @staticmethod
    def _sum_connections(connections: dict, factor_carrying: bool = False):
        total = 0
        for _node, links in connections.items():
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
    def sum_ins(self) -> Fraction:
        return Fraction(str(self._sum_connections(self.ins, True)))

    @property
    def sum_outs(self) -> Fraction:
        return Fraction(str(self._sum_connections(self.outs, True)))

    @property
    def splits_evenly(self) -> bool:
        target = self.sum_outs / self.out_links
        for out in self.outs.values():
            if any(target != amount for amount in out):
                return False
            # for amount in out:
            #     if target != amount:
            #         return False
        return True

    @property
    def splittable(self) -> Fraction:
        if self.out_links > 0:
            links = next(iter(self.outs.values()))
            return next(iter(links))
        return self.holding

    def split_into(self, r) -> Fraction:
        if self.holding == 0:
            return Fraction()
        if self.out_links > 0:
            return self.splittable
        return self.holding / r

    @property
    def id(self) -> str:
        return str(id(self))

    @property
    def node_type(self) -> str:
        node_type = (min(len(self.ins), 2),
                     min(len(self.outs), 2))
        if node_type == (1, 2) and not self.splits_evenly:
            return 'Uneven Splitter'
        return self.NODE_TYPES[node_type]

    @classmethod
    def to_json(cls, start_nodes: set) -> \
            Tuple[Dict[int, Dict[str, int | float | str]],
                  List[List[int]]]:
        all_nodes = {}
        all_edges = []

        # Some sets for faster `in` checks.
        found_nodes = set()
        found_edges = set()

        def find_nodes(curr_node: ConveyorNode):
            if curr_node in found_nodes:
                return
            all_nodes[id(curr_node)] = \
                {'in sum': curr_node.sum_ins.as_integer_ratio(),
                 'out sum': curr_node.sum_outs.as_integer_ratio(),
                 'in links': curr_node.in_links,
                 'out links': curr_node.out_links,
                 'depth': curr_node.depth,
                 'type': curr_node.node_type}

            found_nodes.add(curr_node)

            for to_node, links in curr_node.outs.items():
                if (curr_node, to_node) in found_edges:
                    continue
                found_edges.add((curr_node, to_node))
                for carrying, times in links.items():
                    for _ in range(times):
                        all_edges.append([str(id(curr_node)),
                                          str(id(to_node)),
                                          carrying.as_integer_ratio()])
                find_nodes(to_node)

        for start_node in start_nodes:
            find_nodes(start_node)

        return all_nodes, all_edges

    @staticmethod
    def to_dot(root_node):
        edges = []
        nodes = []
        
        def _to_dot(curr_node: ConveyorNode):
            if curr_node not in nodes:
                nodes.append(curr_node)
                for dst_node, links in curr_node.outs.items():
                    for carrying, times in links.items():
                        for _ in range(times):
                            edges.append([
                                str(id(curr_node)),
                                str(id(dst_node)),
                                carrying.as_integer_ratio()])
                    _to_dot(dst_node)
        
        _to_dot(root_node)
        output = 'digraph G {\n'
        for node in nodes:
            output += f'\t{node.id} [label="{node.sum_ins}"];\n'
        for edge in edges:
            output += f'\t{edge[0]} -> {edge[1]} [label="{edge[2]}"];\n'
        return output + '}'

    @classmethod
    def to_dot_json(cls, root_node):
        all_nodes, all_edges = cls.to_json({root_node})

        output = 'digraph G {\n'
        for node in all_nodes:
            output += f'\t{node} [label="{all_nodes[node]["in sum"]}"];\n'
        for edge in all_edges:
            output += f'\t{edge[0]} -> {edge[1]} [label="{edge[2]}"];\n'
        return output + '}'



def ratio(*targets: Fraction) -> List[int]:
    #  --- Set Up Fractions ---
    # Can't use normal fractions as they auto-reduce.
    fractions = [list(f.as_integer_ratio()) for f in targets]

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


def smart_ratio(*targets: Fraction,
                mk: int = 5, alt_belts: Sequence[int] = None) -> \
        Dict[str, List[float]]:
    # #  --- Set Up Fractions ---
    # fractions = []
    # for fraction in targets:
    #     fractions.append(to_fraction(fraction))

    #  --- Set Up Additional Variables ---
    belts = alt_belts if alt_belts else [60, 120, 270, 480, 780][:mk]
    belts.sort()

    '''Best way to simplify the ratio, defaults to doing nothing'''
    '''The raw values being ratio-ed'''
    best_targets = list(targets)
    '''Simplified ratio by going through ratio()'''
    best_ratio = ratio(*targets)
    '''Lower is better, sum of output from ratio() with additional penalty'''
    best_score = sum(best_ratio)
    '''How to subtract from each each out to get the best ratio.'''
    best_splits = [[] for _ in targets]

    # --- Recursive Function ---
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
                # print(test_splits, test_ratio, test_score)
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
    _smart_ratio(list(targets), 0, best_splits, 0)

    # --- Return ---
    return {'remove': best_splits, 'targets': best_targets,
            'ratio': best_ratio}


def even_split(root_node: ConveyorNode, out_amount: int, max_spit: int = 3) \
        -> List[ConveyorNode]:
    near_nodes = []
    multiplier = root_node.holding / out_amount

    def _split(node: ConveyorNode, into: int, back: List[ConveyorNode]):
        # ToDo (Maybe): Update to allow splitting into greater than 3
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
                    new_back, back = back[:into // s], back[into // s:]
                    node.link_to(new_node, node.split_into(s))
                    _split(new_node, into // s, new_back)
                return
        else:
            back.append(node)
            new_node = ConveyorNode()
            node.link_to(new_node, node.holding + multiplier)
            _split(new_node, into + 1, back)

    _split(root_node, out_amount, [])
    return near_nodes


def even_merge(end_nodes: List[ConveyorNode], into: List[Fraction],
               max_merge: int = 3, respect_order: bool = False) \
        -> List[ConveyorNode]:
    # if len(end_nodes) != sum(into):
    #     raise ValueError(f'{len(end_nodes)} != {sum(into)}')
    if not respect_order:
        into.sort()
    ends = []

    def _merge(remaining_nodes: List[ConveyorNode]) \
            -> ConveyorNode:
        to_node = ConveyorNode()
        for _ in zip(remaining_nodes.copy(), range(max_merge)):
            remaining_nodes.pop(0).link_to(to_node)
        if len(remaining_nodes) > 0:
            remaining_nodes.append(to_node)
            return _merge(remaining_nodes)
        return to_node

    for i, _ in enumerate(into):
        ends.append(_merge(end_nodes[sum(into[:i]):sum(into[:i + 1])]))
    return ends


def smart_split(root_node: ConveyorNode, remove_splits: List[List[int]],
                end_ratio: List[Fraction],
                max_split: int = 3, max_merge: int = 3):
    new_root = root_node
    simp_nodes = []
    for remove in remove_splits:
        these_nodes = []
        next_out = None
        for i, r in enumerate(remove):
            if i % (max_split - 1) == 0:
                next_out = ConveyorNode()
            new_root.link_to(next_out, Fraction(r))
            if i % (max_merge - 1) == 0 or i == len(remove) - 1:
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
                node.link_to(merger)
            simp_nodes.append(merger)

    if sum(end_ratio) > 1:
        out_nodes = even_split(new_root, sum(end_ratio), max_split)
        out_nodes = even_merge(out_nodes, end_ratio, max_merge, True)
        if len(simp_nodes) != len(out_nodes):
            raise ValueError
        for smart_out, merge_out in zip(simp_nodes, out_nodes):
            # smart_out gets turned into a 'Pass Through' node so the
            # connection doesn't get removed but cut_excess.
            new_out = ConveyorNode()
            merge_out.link_to(new_out)
            smart_out.link_to(new_out)


def simplify_graph(start_nodes: Set[ConveyorNode], max_merge: int = 3) \
        -> Dict[str, Set[ConveyorNode]]:
    key_nodes = {'start': start_nodes, 'end': set(),
                 'islands': set(), 'removed': set()}

    seen_nodes = set()

    # operations = {(0, 0): 'island',
    #               (0, 1): 'source',
    #               (0, 2): 'source_splitter',
    #               (1, 0): 'destination',
    #               (1, 1): 'pass_through',
    #               (1, 2): 'splitter',
    #               (2, 0): 'merge_dst',
    #               (2, 1): 'merger',
    #               (2, 2): 'merge_split'}

    done = False

    def _simplify(curr_node: ConveyorNode):
        if curr_node in seen_nodes:
            return
        seen_nodes.add(curr_node)

        # ToDo: Add merge limit.

        did_something = True

        # match node_type:
        match curr_node.node_type:
            case 'Island':
                if curr_node.holding != 0:
                    key_nodes['islands'].add(curr_node)
                else:
                    key_nodes['removed'].add(curr_node)

            case 'Source':
                key_nodes['start'].add(curr_node)
                did_something = False

            case 'Source Splitter':
                output = curr_node.sum_outs
                from_node = ConveyorNode(output)
                from_node.link_to(curr_node)
                curr_node.holding -= output

            case 'Destination':
                key_nodes['end'].add(curr_node)
                did_something = False

            case 'Pass Through':
                src_node = next(iter(curr_node.ins))
                dst_node = next(iter(curr_node.outs))

                relink = curr_node.sum_outs

                while curr_node in dst_node.ins:
                    curr_node.unlink_to(
                        dst_node, next(iter(curr_node.outs[dst_node])))
                while curr_node in src_node.outs:
                    # curr_node.unlink_from(
                    #     src_node, next(iter(curr_node.ins[src_node])))
                    src_node.unlink_to(
                        curr_node, next(iter(curr_node.ins[src_node])))

                src_node.link_to(dst_node, relink)
                key_nodes['removed'].add(curr_node)
                if curr_node.holding != 0:
                    print('removed a node that was holding something...')

            case 'Splitter' | 'Uneven Splitter':
                did_something = False

            case 'Merger Destination':
                to_node = ConveyorNode()
                curr_node.link_to(to_node)
                key_nodes['end'].add(to_node)

            case 'Merger':
                did_something = False

            case 'Merge Splitter':
                to_node = ConveyorNode()
                remove = []
                for dst_node, links in curr_node.outs.items():
                    for carrying, count in links.items():
                        for _ in range(count):
                            to_node.link_to(dst_node, carrying)
                            remove.append((dst_node, carrying))
                for dst_node, carrying in remove:
                    dst_node.unlink_from(curr_node, carrying)

            case _:
                raise ValueError

        if did_something:
            nonlocal done
            done = False

        # if node_type in operations:
        #     operations[node_type](curr_node)
        #     if node_type not in {(1, 0), (0, 1)}:
        #         nonlocal done
        #         done = False

        for dst_node in curr_node.outs.copy():
            _simplify(dst_node)

    def cut_excess(my_node: ConveyorNode):
        cut_nodes = {}

        def _cut_excess(node: ConveyorNode, traced: Set[ConveyorNode]):
            def scan_excess(curr_node: ConveyorNode,
                            trace: Set[ConveyorNode]) \
                    -> List[Set[ConveyorNode] | Tuple[ConveyorNode]]:
                if curr_node.out_links == 0:
                    return [{curr_node}, set()]
                if curr_node in trace:
                    # if curr_node is node:
                    #     return [set(), set()]
                    return [set(), set()]
                child = [set(), set()]
                trace.add(curr_node)
                for link_node in curr_node.outs:
                    if link_node is node:  # Is a cycle
                        child[1] |= {(curr_node, node)}
                        continue
                    child_notes = scan_excess(link_node, trace)
                    child[0] |= child_notes[0]  # Children
                    child[1] |= child_notes[1]  # Children that feed directly into `node`
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
            
            # Has more than one final child
            if len(children) != 1:  
                traced.add(node)
                for linked_node in node.outs:
                    _cut_excess(linked_node, traced)
                traced.remove(node)
                return

            # Has only one final child
            nonlocal cut_nodes
            # Unlink recursive parent(s)
            for unlink_src, unlink_dst in recurse_cut:
                if unlink_dst is not node:
                    raise ValueError
                unlink_src.unlink_to(node)
            # Designate the nodes to shortcut with
            only_child = next(iter(children))
            if only_child not in cut_nodes:
                cut_nodes[only_child] = set()
            cut_nodes[only_child].add(node)
            return

        for out_node in my_node.outs:
            _cut_excess(out_node, {my_node})

        nonlocal done
        done = False
        # Trim out designated shortcut
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


if __name__ == '__main__':

    if len(argv) > 1:
        from cli import main_file

        main_file(argv[1])
