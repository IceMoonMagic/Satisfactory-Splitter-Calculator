// import './ConveyorNode.js'
const GRAPHVIZ_URL = 'https://dreampuf.github.io/GraphvizOnline/#'

window.addEventListener("DOMContentLoaded", () => {
    /* https://jenil.github.io/chota/ */
    if (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches) {
    switchMode(true)
    }
});

function switchMode(toDark = undefined) {
    /* https://jenil.github.io/chota/ */
    const bodyClass = document.body.classList;
    const el = document.getElementsByClassName('color-mode')[0]
    if (toDark === undefined ? !bodyClass.contains('dark') : toDark) {
        bodyClass.add('dark')
        el.innerHTML = "Light Mode"
    } else {
        bodyClass.remove("dark")
        el.innerHTML = "Dark Mode"
    }
      
    const text_color = getComputedStyle(document.body).getPropertyValue('--font-color').slice(1)
    const text_icons = document.getElementsByClassName("text-icon")
    for (let icon of text_icons) {
        const src = icon.getAttribute('src')
        const location = src.indexOf('color=') + 'color='.length
        const new_src = src.replace(src.substring(location, location+6), text_color)
        icon.setAttribute('src', new_src)
    }
}

function setTab(nav, section_name) {
    for (let nav_item of nav.parentElement.children) {
        if (nav_item.classList.contains('active')) {
            nav_item.classList.remove('active')
        }
    }
    nav.classList.add('active')
    const target_section = document.getElementById(section_name)
    for (let section of target_section.parentElement.children) {
        section.hidden = section !== target_section
    }
}

function addInput(section_id, value = 1) {
    const section =document.getElementById(section_id)
    const row = document.createElement('div')
    const input = document.createElement('input')
    const remove = document.createElement('button')
    const remove_icon = document.createTextNode('🗑')

    section.append(row)
    row.append(input)
    row.append(remove)
    remove.append(remove_icon)

    row.classList.add('row')

    input.setAttribute('class', 'col')
    input.setAttribute('type', 'number')
    input.setAttribute('min', '0')
    input.setAttribute('value', '0')
    input.value = value

    remove.setAttribute('class', 'button error col-1')
    remove.setAttribute('onclick', 'this.parentElement.remove()')

    return input
}

function readInputs(name) {
    const inputs = document.getElementById(name).getElementsByTagName('input')
    const values = new Array()
    for (let input of inputs) {
        values.push(input.value)
    }
    return values
}

class RatioSettings {
    constructor(
        sources = [3], 
        targets = [2, 1], 
        max_splits = 3, 
        max_merges = 3, 
        try_perms = false
    ) {
        this.sources = sources
        this.targets = targets
        this.max_splits = max_splits
        this.max_merges = max_merges
        this.try_perms = try_perms
    }
}

function importRatio(values = undefined) {
    values = values || new RatioSettings()
    
    document.getElementById('ratio_sources').innerHTML = ''
    values.sources.forEach(src => addInput('ratio_sources', src))

    document.getElementById('ratio_targets').innerHTML = ''
    values.targets.forEach(src => addInput('ratio_targets', src))

    document.getElementById('ratio_splits').value = values.max_splits
    document.getElementById('ratio_merges').value = values.max_merges
    
    document.getElementById('ratio_perms').value = values.try_perms
}

function exportRatio() {
    return new RatioSettings(
        readInputs('ratio_sources'),
        readInputs('ratio_targets'),
        document.getElementById('ratio_splits').value,
        document.getElementById('ratio_merges').value,
        document.getElementById('ratio_perms').value,
    )
}

function calculateRatio() {
    const sources = readInputs('ratio_sources')
    const targets = readInputs('ratio_targets')
    const max_split = document.getElementById('ratio_splits').value
    const max_merge = document.getElementById('ratio_merges').value

    const sum_sources = sources.length != 0 ? Decimal.sum(...sources) : new Decimal(0)
    const sum_targets = targets.length != 0 ? Decimal.sum(...targets) : new Decimal(0)

    if (sum_sources == 0 && sum_targets == 0) {
        return

    } else if (sum_sources.lt(sum_targets)) {
        const diff = sum_targets.sub(sum_sources)
        const new_source = addInput('ratio_sources')
        new_source.value = diff
        return calculateRatio()
    } else if (sum_targets.lt(sum_sources)) {
        const diff = sum_sources.sub(sum_targets)
        const new_target = addInput('ratio_targets')
        new_target.value = diff
        return calculateRatio()
    }

    let result
    if (document.getElementById('ratio_perms').checked) {
        result = main_find_best(targets, sources, max_split, max_merge)
    } else {
        console.log(targets, sources, max_split, max_merge)
        result = main(targets, sources, max_split, max_merge)
    }
    const digraph = GraphSettings.from_page().to_dot(result)
    document.getElementById('ratio_out').innerHTML = digraph
    const link = GRAPHVIZ_URL + encodeURI(digraph)
    document.getElementById('ratio_link').setAttribute('href', link)
}

class EvenSettings {
    constructor(
        sources = [3], 
        max_splits = 3, 
    ) {
        this.sources = sources
        this.max_splits = max_splits
    }
}

function importEven(values = undefined) {
    values = values || new EvenSettings()
    
    document.getElementById('even_sources').innerHTML = ''
    values.sources.forEach(src => addInput('even_sources', src))

    document.getElementById('even_splits').value = values.max_splits
}

function exportEven() {
    return new EvenSettings(
        readInputs('even_sources'),
        document.getElementById('even_splits').value
    )
}

function calculateEven() {
    const sources = readInputs('even_sources')
    const max_split = document.getElementById('even_splits').value

    if (sources.length == 0 || Decimal.sum(...sources).eq(0)) {
        return
    }

    const result = main_split(sources, max_split)
    const digraph = GraphSettings.from_page().to_dot(result)
    document.getElementById('even_out').innerHTML = digraph
    const link = GRAPHVIZ_URL + encodeURI(digraph)
    document.getElementById('even_link').setAttribute('href', link)
}

function syncMachines(element) {
    const multiplier = element.id == 'machines dec' ? 100 : 0.01
    const sync_with = document.getElementById(
        element.id == 'machines dec' ? 'machines per' : 'machines dec'
    )
    sync_with.value = (element.value * multiplier).toFixed(element.id == 'machines dec' ? 4 : 6)
}

class MachineSettings {
    constructor(
        clock = 1, 
        min_machines = 2, 
    ) {
        this.clock = clock
        this.min_machines = min_machines
    }
}

function importMachines(values = undefined) {
    values = values || new MachineSettings()
    document.getElementById('machines dec').value = values.clock
    syncMachines(document.getElementById('machines dec'))
    document.getElementById('machines_min').value = values.min_machines
}

function exportMachines() {
    return new MachineSettings(
        document.getElementById('machines dec').value,
        document.getElementById('machines_min').value
    )
}

function calculateCount() {
    const input = document.getElementById('machines dec')
    const min = document.getElementById('machines_min')
    const result = find_machine_count(new Decimal(input.value), min.value)
    const out_c = document.getElementById('machines count')
    const out_d = document.getElementById('machines out dec')
    const out_p = document.getElementById('machines out per')
    if (result == -1) {
        out_c.innerHTML = '-1'
        out_d.innerHTML = '-1'
        out_p.innerHTML = '-1'
    }
    else {
        out_c.innerHTML = result
        const clock = new Decimal(input.value).div(result)
        out_d.innerHTML = clock.toDecimalPlaces(6)
        out_p.innerHTML = clock.mul(100).toDecimalPlaces(6) + '%'        
    }
}


class MetaSettings {
    constructor(
        dark_mode = document.body.classList.contains('dark'),
        graph_settings = new GraphSettings()
    ) {
        this.dark_mode = dark_mode
        this.graph_settings = graph_settings
    }
}

function importMetaSettings(values = undefined) {
    values = values || new MetaSettings()
    switchMode(values.dark_mode)
    values.graph_settings.to_page()
}

function exportMetaSettings() {
    return new MetaSettings(
        document.body.classList.contains('dark')
    )
}

class AllSettings {
    constructor (ratio, even, machines, meta) {
        this.ratio = ratio
        this.even = even
        this.machines = machines
        this.meta = meta
    }
}

function importAllSettings(values) {
    importRatio(values.ratio)
    importEven(values.even)
    importMachines(values.machines)
    importMetaSettings(values.meta)
}

function exportAllSettings() {
    return new AllSettings(
        exportRatio(),
        exportEven(),
        exportMachines(),
        exportMetaSettings()
    )
}

class GraphSettings {
    constructor (
        edge_shape = 'spline',
        edge_label = '${edge.carrying}',
        head_label = '',
        tail_label = '',
        node_shape = 'ellipse',
        node_label = '${node.sum_outs}',
        source_shape = 'ellipse',
        source_label = '',
        split_shape = 'inherit',
        split_label = '',
        merge_shape = 'octagon',
        merge_label = '',
        target_shape = 'invhouse',
        target_label = '${node.holding}',
    ) {
        this.edge_shape = edge_shape
        this.edge_label = edge_label
        this.head_label = head_label
        this.tail_label = tail_label
        this.node_shape = node_shape
        this.node_label = node_label
        this.source_shape = source_shape
        this.source_label = source_label
        this.split_shape = split_shape
        this.split_label = split_label
        this.merge_shape = merge_shape
        this.merge_label = merge_label
        this.target_shape = target_shape
        this.target_label = target_label 
    }

    static from_page() {
        return new GraphSettings(
            document.getElementById('splines').value,
            document.getElementById('edge label').value,
            document.getElementById('head label').value,
            document.getElementById('tail label').value,
            document.getElementById('node shape').value,
            document.getElementById('node label').value,
            document.getElementById('source shape').value,
            document.getElementById('source label').value,
            document.getElementById('split shape').value,
            document.getElementById('split label').value,
            document.getElementById('merge shape').value,
            document.getElementById('merge label').value,
            document.getElementById('target shape').value,
            document.getElementById('target label').value,
        )
    }

    to_page() {
        document.getElementById('splines').value = this.edge_shape
        document.getElementById('edge label').value = this.edge_label
        document.getElementById('head label').value = this.head_label
        document.getElementById('tail label').value = this.tail_label
        document.getElementById('node shape').value = this.node_shape
        document.getElementById('node label').value = this.node_label
        document.getElementById('source shape').value = this.source_shape
        document.getElementById('source label').value = this.source_label
        document.getElementById('split shape').value = this.split_shape
        document.getElementById('split label').value = this.split_label
        document.getElementById('merge shape').value = this.merge_shape
        document.getElementById('merge label').value = this.merge_label
        document.getElementById('target shape').value = this.target_shape
        document.getElementById('target label').value = this.target_label
    }


    static exportSettings() {
        const factory = JSON.stringify(GraphSettings.from_page(), null, 4);
        const blob = new Blob([factory], {type: 'application/json;charset=utf-8;'});
        const downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', window.URL.createObjectURL(blob));
        downloadLink.setAttribute('download', 'GraphSettings.json');
        downloadLink.click();
    }

    static importSettings() {
        const upload_input = document.createElement('input');
        upload_input.setAttribute('type', 'file');
        upload_input.setAttribute('allow', 'application/json');
        upload_input.oninput = function() {
            const file = upload_input.files[0];
            if (file === null) {
                return;
            }
            const fr = new FileReader();
            fr.onload = function(event) {
                const parsed = JSON.parse(event.target.result)
                new GraphSettings(
                    parsed.edge_shape,
                    parsed.edge_label,
                    parsed.head_label,
                    parsed.tail_label,
                    parsed.node_shape,
                    parsed.node_label,
                    parsed.source_shape,
                    parsed.source_label,
                    parsed.split_shape,
                    parsed.split_label,
                    parsed.merge_shape,
                    parsed.merge_label,
                    parsed.target_shape,
                    parsed.target_label
                ).to_page()
            };
            fr.readAsText(file);
        };
        upload_input.click();
    }

    to_dot(root_nodes) {
        const edgesAndNodes = findEdgesAndNodes(...root_nodes)
        let output = "digraph G {\n"
        if (this.edge_shape != 'spline') {
            output += `\tsplines=${this.edge_shape};\n`
        }
        for (let node of edgesAndNodes.nodes) {
            output += `\t${node.id} [label="`
            switch (node.node_type) {
                case NODE_TYPES.Source:
                    output += this.source_label ? eval('`' + this.source_label + '`') : eval('`' + this.node_label + '`')
                    output += '" shape="'
                    output += this.source_shape ? this.source_shape : this.node_shape
                    break
                case NODE_TYPES.Splitter:
                    output += this.split_label ? eval('`' + this.split_label + '`') : eval('`' + this.node_label + '`')
                    output += '" shape="'
                    output += this.split_shape ? this.split_shape : this.node_shape
                    break
                case NODE_TYPES.Merger:
                    output += this.merge_label ? eval('`' + this.merge_label + '`') : eval('`' + this.node_label + '`')
                    output += '" shape="'
                    output += this.merge_shape ? this.merge_shape : this.node_shape
                    break
                case NODE_TYPES.Destination:
                    output += this.target_label ? eval('`' + this.target_label + '`') : eval('`' + this.node_label + '`')
                    output += '" shape="'
                    output += this.target_shape ? this.target_shape : this.node_shape
                    break
                default:
                    output += eval(this.node_label)
                    output += '" shape="'
                    output += this.node_shape
                    break
            }
            output += '"];\n'
            console.log(node)
        }

        for (let edge of edgesAndNodes.edges) {
            output += `\t${edge.src.id} -> ${edge.dst.id} [`
            if (this.edge_label) {
                output += `label="${eval('`' + this.edge_label + '`')}"`
            }
            if (this.edge_label && this.head_label) {
                output += ' '
            }
            if (this.head_label) {
                output += `headlabel="${eval('`' + this.head_label + '`')}"`
            }
            if ((this.edge_label || this.head_label) && this.tail_label) {
                output += ' '
            }
            if (this.tail_label) {
                output += `taillabel="${eval('`' + this.tail_label + '`')}"`
            }
            output += "];\n"
        }
        return output + "}"
    }
}

function exportSettings() {
    const factory = JSON.stringify(exportAllSettings(), null, 4);
    const blob = new Blob([factory], {type: 'application/json;charset=utf-8;'});
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', window.URL.createObjectURL(blob));
    downloadLink.setAttribute('download', 'SplitterCalculator.json');
    downloadLink.click();
}

function importSettings() {
    const upload_input = document.createElement('input');
    upload_input.setAttribute('type', 'file');
    upload_input.setAttribute('allow', 'application/json');
    upload_input.oninput = function() {
        const file = upload_input.files[0];
        if (file === null) {
            return;
        }
        const fr = new FileReader();
        fr.onload = function(event) {
            importAllSettings(JSON.parse(event.target.result));
        };
        fr.readAsText(file);
    };
    upload_input.click();
}