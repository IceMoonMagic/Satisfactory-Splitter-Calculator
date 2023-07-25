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

function addInput(section_id, value = 0) {
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
        const new_source = addInput(document.getElementById('ratio_sources_button'))
        new_source.value = diff
        return calculateRatio()
    } else if (sum_targets.lt(sum_sources)) {
        const diff = sum_sources.sub(sum_targets)
        const new_target = addInput(document.getElementById('ratio_targets_button'))
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
    const digraph = to_dot(result)
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
    const digraph = to_dot(result)
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
        dark_mode = document.body.classList.contains('dark')
    ) {
        this.dark_mode = dark_mode
    }
}

function importMetaSettings(values = undefined) {
    values = values || new MetaSettings()
    switchMode(values.dark_mode)
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