# Satisfactory Splitter Calculator
A tool to help calculate how to split conveyors in Satisfactory into specific ratios.

> [!NOTE]
> A [manifold](https://satisfactory.wiki.gg/wiki/Manifold) can be used in most, if not all,
> use cases for this project.
> That doesn't mean you shouldn't / can't use balancers. 
> Play the game however *you* want to play.&emsp;(°◡°♡)

## Usage
Free to use on [GitHub Pages](https://icemoonmagic.github.io/Satisfactory-Splitter-Calculator/)

### Split Ratio
Sources are your input belts (in items per minute), targets are your output belts.
If these don't match up, it will be corrected by adding the difference to the lesser side.

Inputs must be greater than 0 for it to work. Aso, changing the order of sources and targets may result in larger or smaller graphs.

> [!NOTE]
> This is similar to a [belt balancer](https://satisfactory.wiki.gg/wiki/Balancer#Belt_balancer), but allowing differing output amounts.

> [!IMPORTANT]
> This *will not* guarantee that items from all inputs make it to all outputs.
> Just that if fed the specified items/min per input, it will output the specified items/min per output.

The resulting graph tends to vary depending on the order of the lists. 
To help with that, there is an option to "Calculate all permutations and show simplest".
This will run the calculation on every possible way to order both inputs and outputs, 
taking the one with smallest number of nodes + number of edges.
E.g. [1, 2, 3] -> [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]].

> [!CAUTION]
The number of permutations here is factorial(number of inputs) * factorial(number of outputs), which gets *very* big *very* fast, which will make it take a *very* long time.
The option to enable shows how many permutations there are.

### Split Evenly
Similar to `Split Ratio`, will break the sources into `N` outputs (where `N` equals the sum of the sources).

> [!NOTE]
> This is a [load balancer](https://satisfactory.wiki.gg/wiki/Balancer#Load_balancer).

### Loopback Bottlenecking
When merging a loop back belt, the resulting belt may be carrying more than the original input.
This can cause a problem if that belt is already at it's capacity.
There is an alternate way to merge the loop back in this case, which is *slightly* more complex. 
An example of the difference can be found on the 
[Satisfactory Wiki](https://satisfactory.wiki.gg/wiki/Balancer#/media/File:Balancer_odd.png).

To get the solver to use it, set the maximum available belt speed and the solver will replace loop back belts that surpass that maximum.
To ensure the solver doesn't try fixing belts that it can't, the minimum belt speed is set to the largest Source / Target.

### Outputs
The output for Split Ratio and Split Evenly can be displayed with either [Graphviz](https://www.graphviz.org/) or [Mermaid](mermaid.js.org). 
Both provide a rendered SVG along with the associated input text.

The text can be downloaded as a `.dot` or `.mmd` file for Graphviz and Mermaid respectively. However, the files are still plain text, so they can safely be renamed to `.txt`. 
Additionally, a button links to online editors, [dreampuf's GraphvizOnline](https://github.com/dreampuf/GraphvizOnline) for Graphviz and [Mermaid's Live Editor](https://mermaid.live).

At this time, downloading the graph as a PNG or SVG are not implemented. 
However, both online editors support this functionality.

It is likely still not perfect and I recommend checking that it makes sense. Mainly the sum of the inputs match the sum of the outputs and that the inputs and outputs are what you expect.

### Machine Count
Determines the number of machines needed to split `Clock Speed` evenly while still totaling `Clock Speed` given [Satisfactory's Precision](https://satisfactory.fandom.com/wiki/Clock_speed#Precision). Provides number of machines and clock speed.

This is based on the assumption of 4 decimal places of precision (6 if using clock speed as a decimal).

## How It Works
<details>
<summary> How It Works </summary>

### Simplifying Ratio
To reduce the amount of work that needs to be done, the first step is to simlify the ratio. This also helps with decimal inputs.

Using some "fun" math, the lowest common denominator (or, more accurately, lowest common multiple of teh denominators) is found and made to the denominator of each input.
After that, the greatest common factor is found and used as a divisor to get the final simplified ratio.

### Splitting
The inputs are then split into `N` equal parts (where `N` is the sum of the sources). Given there are multiple ways to split to the same number (e.g. 6 be /2 then /3 twice or /3 then /2 thrice), dividing by 2 is prefered over 3 to reduce overall node count. 

If a node can be divided cleanly by 2 or 3, it will be. If it can't be cleanly divided, it will spawn a child and connect carrying "1" more than it has and mark itself as a "back node". When one of it's children becomes able to break into multiple "1" nodes (i.e. equaling 2 or 3), one of it's outputs will be redirected back to the node.

(2 and 3 are mentioned due to being default, but it does change with different a `max split` setting)

("1" may not equal 1 in cases where [Simplifying Ratio](#simplifying-ratio) simplified the sources / targets)

### Merging
Given an array of nodes, `M` nodes are taken to be merged (where `M` equals one of the targets).
These nodes could just be merged together, but that would likely leave a lot of redundent nodes that get split just to be merged together again. 

To fix this, before merging, the parent of a node to be merged is looked at. If all of this parent's children are set to be merged, the children are disconnected and dismissed from merging while the parent is set in their place. This continues untill all the nodes either have no parent or all nodes have children that are excluded from merging.

If a child that is feeding a "back node" is checking itself, all of the children of the "back node" must be set for merging.

### Graphing
The `ConveyorNode`s and `ConveyorLink`s that are used internally represent nodes and edges respectfully (for graphing purposes at least), but need to be converted to work with [Graphviz](#graphviz). This is done simply by iterating over each root and recursing throught their children, recording the nodes and edges along the way. Afterwords, the noted nodes / edges are put into a string following the Dot Language.

</details>

## *Possible* Future Additions
- Re-Implement using smart splitters to simplify outputs (like in Python Version)
- Splitter "Playground", allowing manual editing of graph
- Prefer larger splits first (requires finding prime factors beforehand)
- Calculate all unique multiset permutations rather *all* permutations

## Development
This project uses Vue 3 + TypeScript + Vite and deploys to Github Pages.

### Dependancies
- `@heroicons/vue`: Icons
- `@viz-js/viz`: Graphviz Renderer
- `decimal.js`: Precise math, avoiding issues with float
- `js-base64`: Required for a step for sending to [Mermaid.live](https://mermaid.live)
- `pako`: Required for a step for sending to [Mermaid.live](https://mermaid.live)
- `vue`: The UI framework
- `vue-mermaid-string`: Convenient component for rendering Mermaid
- Dev
    - `@catppuccin/tailwindcss`: Catppuccin Colors
    - `@vitejs/plugin-vue`: Vite + Vue
    - `autoprefixer`: Something relating to Tailwind CSS
    - `postcss`: Something relating to Tailwind CSS
    - `tailwindcss`: Styling
    - `typescript`: TypeScript
    - `vite`: Bundler
    - `vue-tsc`: Vue + TS

VS-Code Plugins:
- [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Contributing
I don't really have experience collaborating through GitHub, but you are welcome to submit a pull request. Good luck though, I tried keeping it clean, but some places are better than others and documentation / comments still need some work. (I'll get to it eventually (probably)).

## License
[MIT](https://choosealicense.com/licenses/mit/)