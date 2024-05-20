# Satisfactory Splitter Calculator
A tool to help calculate how to split conveyors in Satisfactory into specific ratios.

## Usage
Free to use on [GitHub Pages](https://icemoonmagic.github.io/Satisfactory-Splitter-Calculator/)

### Split Ratio
Sources are your input belts (in items per minute), targets are your output belts.
If these don't match up, it will be corrected by adding the difference to the lesser side.

Inputs must be greater than 0 for it to work.

### Split Evenly
Similar to `Split Ratio`, will break the sources into `N` outputs (where `N` equals the sum of the sources).

### Graphviz
Output is provided in text box as a [Graphviz](https://www.graphviz.org/) [Dot](https://www.graphviz.org/doc/info/lang.html) file. Additionally, a button links to a graphviz online visualizer (thanks to [dreampuf's GraphvizOnline](https://github.com/dreampuf/GraphvizOnline))


It is likely still not perfect and I recommend checking that it makes sense. Mainly the sum of the inputs match the sum of the outputs and that the inputs and outputs are what you expect.

### Machine Count
Determines the number of machines needed to split `Clock Speed` evenly while still totaling `Clock Speed` given [Satisfactory's Precision](https://satisfactory.fandom.com/wiki/Clock_speed#Precision). Provides number of machines and clock speed.

This is based the assumption of 6 decimal places of precision (4 if using clock speed as a percentage).

### Settings
Export / Import will work on all of the tabs' settings (but not the output calculations). Graph Settings will likely recieve dedicated buttons for Export / Import when implemented.

Light / Dark Mode is set automatically based on the browser but can be manually switched with the button.

Graph Settings are not implemented yet.

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

## Planned Additions
- More comprehensive input validation
    - (Maybe) Add tool tips
- (Maybe) Local digraph visualization
- (Maybe) Re-Implement using smart splitters to simplify outputs (like in Python Version)

## Contributing
I don't really have experience collaborating through GitHub, but you are welcome to submit a pull request. Good luck though, I tried keeping it clean, but some places are better than others and documentation / comments still need some work. (I'll get to it eventually (probably)).

## License
[MIT](https://choosealicense.com/licenses/mit/)

# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (previously Volar) and disable Vetur

- Use [vue-tsc](https://github.com/vuejs/language-tools/tree/master/packages/tsc) for performing the same type checking from the command line, or for generating d.ts files for SFCs.
