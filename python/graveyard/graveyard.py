from conveyor_nodes import *


def split(source_nodes: Dict[float, Set[ConveyorNode]],
          target_nodes: Dict[float, Set[ConveyorNode]]):
    pass  # So text below isn't considered a docstring.
    '''I originally figured that it's probably possible to determine if a 
    node would end up at a specific target by doing some math. I'm still 
    sure of this, however, my attempt here is extremely unreliable and the 
    layout of the final product changes arbitrarily due to set.pop() '''
    done_nodes = set()

    def get_node(holding: float, hold_dict: Dict[float, set]) -> ConveyorNode:
        node = hold_dict[holding].pop()
        if len(hold_dict[holding]) == 0:
            del hold_dict[holding]
        return node

    def store_node(node: ConveyorNode,
                   hold_dict: Dict[float, set] = None) -> float:
        store_at = node.holding
        # hold_dict should only be None when it's really going into done_nodes
        # hold_dict = hold_dict if hold_dict else target_nodes
        if store_at == 0:
            done_nodes.add(node)
            return 0

        if hold_dict is source_nodes:
            store_at = node.splittable
        elif hold_dict is target_nodes:
            store_at *= -1
        if store_at not in hold_dict:
            hold_dict[store_at] = set()
        hold_dict[store_at].add(node)
        return store_at

    def _split(node: ConveyorNode):
        splits = [2, 3]
        # nonlocal source_nodes, target_nodes, done_nodes
        if node.holding == 0:
            done_nodes.add(node)
            return
        elif len(target_nodes) == 0:
            return 0
        holding = node.splittable

        # --- Node can fulfill a target ---
        # If a node has no out splits but can fulfill a target
        # May cause pass-through nodes
        if node.out_links == 0 and node.holding in target_nodes:
            to_node = get_node(holding, target_nodes)
            node.link_to(to_node, holding)
            store_node(to_node)
            _split(node)
            if node in done_nodes:
                return
        # If a node has been split but an arm can fulfill a target
        if node.out_links > 0 and node.splittable in target_nodes:
            while node.splittable in target_nodes:
                to_node = get_node(node.splittable, target_nodes)
                node.link_to(to_node)
                store_node(to_node)
            _split(node)
            if node in done_nodes:
                return

        # --- Node can merge some of its outputs to make a target ---
        for s in splits:
            if node.split_into(s) * (s - 1) in target_nodes and \
                    True:
                # s != node.split_into(s):
                while node.split_into(s) * (s - 1) in target_nodes:
                    middle_node = ConveyorNode()
                    to_node = get_node(node.split_into(s) * (s - 1),
                                       target_nodes)
                    for _ in range(s - 1):
                        node.link_to(middle_node, node.split_into(s))
                    middle_node.link_to(to_node)
                    store_node(middle_node)
                    store_node(to_node)
                _split(node)
                if node in done_nodes:
                    return

        # --- Node can split into a target ---
        for s in splits:
            if node.split_into(s) in target_nodes:
                while node.split_into(s) in target_nodes:
                    to_node = get_node(node.split_into(s), target_nodes)
                    node.link_to(to_node, node.split_into(s))
                    store_node(to_node)
                _split(node)
                if node in done_nodes:
                    return

        # --- Node can sum other source nodes to make target ---
        for s in [1] + splits:
            # If node can split to be less than a target
            if any(node.split_into(s) < t for t in target_nodes):
                source_values = [0]
                for source_value in source_nodes:
                    for _ in source_nodes[source_value]:
                        source_values.append(source_value)

                source_values.sort(reverse=True)

                for i, s_val2 in enumerate(source_values[:-1]):
                    pass
                    for s_val1 in source_values[i + 1:]:
                        equals = node.split_into(s) + s_val1 + s_val2 \
                                 in target_nodes
                        if equals:
                            print(end='')
                        if equals or any(node.split_into(s) + s_val1 + s_val2
                                         < target for target in target_nodes):
                            middle_node = ConveyorNode()

                            if s_val1 != 0:
                                s_node1 = get_node(s_val1, source_nodes)
                                s_node1.link_to(middle_node)
                                store_node(s_node1, source_nodes)

                            s_node2 = get_node(s_val2, source_nodes)
                            s_node2.link_to(middle_node)
                            store_node(s_node2, source_nodes)

                            if equals:
                                to_node = get_node(
                                    node.split_into(s) + s_val1 + s_val2,
                                    target_nodes)
                                node.link_to(middle_node)
                                middle_node.link_to(to_node)
                                store_node(middle_node, source_nodes)
                                store_node(to_node)
                                _split(node)
                            else:
                                node.link_to(middle_node)
                                store_node(middle_node, source_nodes)
                                store_node(node, source_nodes)
                                return
                            break
                    else:
                        continue
                    break
                else:
                    continue
                break

        # If a node hasn't split, force it too
        if node.out_links == 0:
            for s in splits:
                # If node splits evenly
                if holding % s == 0:
                    for _ in range(s):
                        to_node = ConveyorNode()
                        node.link_to(to_node, holding / s)
                        _split(to_node)
                        store_node(to_node, source_nodes)
                    return

            # if that didn't work either make back loop or add as a source
            # if node.out_links == 0:
            if node.holding == 1:
                store_node(node, source_nodes)
                return
            to_node = ConveyorNode()
            node.link_to(to_node, node.holding + 1)
            store_node(node, target_nodes)
            _split(to_node)
        else:
            while node.holding > 0:
                to_node = ConveyorNode()
                node.link_to(to_node)
                _split(to_node)
                store_node(to_node, source_nodes)

    while len(source_nodes) > 0:
        my_node = get_node(next(iter(source_nodes)), source_nodes)
        _split(my_node)
        store_node(my_node, source_nodes)


def node_dict(nodes: Set[ConveyorNode], invert: bool = False) \
        -> Dict[float, Set[ConveyorNode]]:
    pass
    '''Just helps makes the dicts needed for split().'''
    nodes_dict = {}
    for node in nodes:
        holding = node.holding
        if invert:
            holding *= -1
        if holding not in nodes_dict:
            nodes_dict[holding] = set()
        nodes_dict[holding].add(node)
    return nodes_dict


def split_1m(*targets: int, display_multi: float = 1) -> ConveyorNode:
    pass
    '''Made this after I decided that split() should be able to handle many 
    inputs to outputs, and this one was specifically for one source to many 
    destinations.'''
    # if any(t != targets[0] for t in targets):
    #     raise NotImplementedError()
    root_node = ConveyorNode(sum(targets), display_multi)
    source_node = ConveyorNode()
    source_node.link_from(root_node)

    target_nodes = {}
    for target in targets:
        if target not in target_nodes:
            target_nodes[target] = set()
        target_nodes[target].add(
            ConveyorNode(-target, display_multi))

    split({sum(targets): {source_node}}, target_nodes)
    return root_node


# in simplify_graph():
'''The next two where my original attempt at what is now cut_excess() in 
simplify_graph. I think one of it's main problems was correctly reporting 
back what needed to be reconnected afterwards. Also what it returns started 
really getting out of hand. '''


def _test_children_wrapper(curr_node: ConveyorNode,
                           calling_nodes: Set[ConveyorNode]) \
        -> List[Union[Set[ConveyorNode],
                      Dict[Tuple[ConveyorNode, ConveyorNode],
                           Dict[float, int]]]]:

    if curr_node in calling_nodes:
        pass
        return [set(), {}, {curr_node}]
    calling_nodes.add(curr_node)
    out = _test_children(curr_node, calling_nodes)
    calling_nodes.remove(curr_node)
    return out


def _test_children(curr_node: ConveyorNode,
                   calling_nodes: Set[ConveyorNode]) \
        -> List[Union[Set[ConveyorNode],
                Dict[Tuple[ConveyorNode, ConveyorNode],
                     Dict[float, int]]]]:

    recurse_children = set()
    children = set()
    other_links = {}

    def merge_other_links(new_dict: Dict[Tuple[ConveyorNode, ConveyorNode],
                                         Dict[float, int]]):
        for p_node, _links in new_dict.items():
            _p_nodes = p_node if isinstance(p_node, tuple)\
                else (p_node, curr_node)
            if _p_nodes[0] is curr_node:
                continue
            if _p_nodes not in other_links:
                other_links[_p_nodes] = _links
            else:
                for _carrying, _count in _links:
                    if _carrying not in other_links[_p_nodes]:
                        other_links[_p_nodes][_carrying] = 0
                    other_links[_p_nodes][_carrying] += _count

    if curr_node.out_links == 0:
        merge_other_links(curr_node.ins)
        return [{next(iter(curr_node.ins))}, other_links, set()]
        # return [{curr_node}, other_links]

    for child_node in curr_node.outs.copy():
        child_notes = _test_children_wrapper(child_node, calling_nodes)
        children |= child_notes[0]
        recurse_children |= child_notes[2]
        recurse_children -= {curr_node}
        if len(children) > 1:
            continue
        merge_other_links(child_notes[1])
        # for p_nodes, links in child_notes[1]:
        #     if p_nodes[0] is curr_node:
        #         continue
        #     if p_nodes not in other_links:
        #         other_links[p_nodes] = links
        #     else:
        #         for carrying, count in links:
        #             if carrying not in other_links[p_nodes]:
        #                 other_links[p_nodes][carrying] = 0
        #             other_links[p_nodes][carrying] += count

    if len(children) == 1 and curr_node in children:
        # children.add(curr_node)
        return [children, other_links, recurse_children]
    elif len(children) == 1:
        if len(children | recurse_children) > 1:
            return [children, other_links, recurse_children]
        print('One Child')
        only_child = next(iter(children))
        if not (only_child in curr_node.outs and len(curr_node.outs) == 1):
            print('Removing')
            # foo = False
            # if foo:
            #     raise RecursionError
            nonlocal done
            done = False
            holding = only_child.holding
            bar = curr_node.sum_outs
            for other_link in other_links.values():
                for k, e in other_link.items():
                    bar += k * e
            if bar != holding:
                # raise ValueError('Will chop wrong')
                print('Will chop wrong')
            # if sum([curr_node.sum_outs, [t * a for t, a in other_links.values().items()]])
            curr_node.unlink_to_all()
            only_child.unlink_from_all()
            curr_node.link_to(only_child)
            for p_nodes, links in other_links.copy().items():
                for carrying, count in links.copy().items():
                    for _ in range(count):
                        p_nodes[0].unlink_to(p_nodes[1], carrying)
                        p_nodes[0].link_to(only_child, carrying)
            if only_child.holding != holding:
                raise ValueError('Chopped something without repairing')

            # other_links = {parent: links for parent, links in curr_node.ins
            #                if parent is not call_node}

            other_links.clear()
            merge_other_links(curr_node.ins)
            merge_other_links(_test_children_wrapper(only_child, calling_nodes)[1])

            # if len(only_child.ins) > 1:
            #     merge_dst(only_child)
            #     return [set(curr_node.outs), other_links]
            return [children, other_links, recurse_children]
        else:
            merge_other_links(curr_node.ins)
            return [children, other_links, recurse_children]
    print('How Sad', len(children))
    return [children, {}, recurse_children]
