# Satisfactory Splitter Calculator

A tool to help calculate how to split conveyors in Satisfactory into specific ratios.

## Dependencies
[Python 3.9](https://python.org) (probably works on 3.6+)

[PyYAML](https://pypi.org/project/PyYAML/)

[Python Graphviz](https://pypi.org/project/PyYAML/) (Note: Requires Graphviz, more details on pypi.

## Usage

Run run `conveyor_nodes.py` with a YAML file as the first argument.
```bash
python conveyor_nodes.py my_yaml.yaml
```
or just drag and drop the YAML onto `conveyor_nodes.py` so that it "Opens With" the python file.

### YAML File
The YAML File is broken into multiple parts, broken up by `---`. The first is the config section, that holds the options available to change how the program will calculate and show its output.

The second section is where you put what it is going to do. There are currently only three things that can go in here.
```yaml
Calculate: output_filename    # This tell it to calculate the values in the next section and output to output_filename.
Save Nodes: Yes    # If the Calculate is present, will additionally save to output_filename.yaml all the nodes used for the output.
Graph: output_filename    # This will try reloading nodes from the next section. Automatically set in file created by Save Nodes.
```

The third / last section is the ratio input. If you would like to just evenly split a belt into N outputs:
```yaml
- N    # Where N is the desired amount of outputs. N should be an integer or it will fail.
```
Otherwise, put in how much to give to each output and put floats / decimals in as fractions or mixed numbers.
```yaml
# Example of 3:5
- 3
- 5

# Example of a fraction (3/5):
- - 3
  - 5

# Example of mixed number (7 5/9):
- - 7
  - 5
  - 9

# Can also be used to get N outputs showing value X, example 5 of 12:
- 12
- 12
- 12
- 12
- 12
```

## Output
Output is done with a Graphviz Digraph. From each node, there is an arrow pointing to where it goes. The arrow should be labeled, but it may be hard on some outputs to associate a number with a node.
When graphing, nodes are displayed in a few different ways depending on what it represents.

By Default, the house and inverted houses are Inputs and Output respectively.
Diamonds are for splitters while diamonds with lines inside are smart splitters set to send everything down some belt amount with overflow for the rest.
Squares are mergers. Currently, a chain of mergers will be condensed into a single merger, but I may change/fix that in the future.

Some examples:

[Graph for 1:3](examples/1to3.gv.png)

[Graph for 60:15](examples/60to15.gv.png)

[Graph for even split between 15](examples/15.gv.png)

[Graph for 33 1/3 : 5 1/8](examples/33.3333to5.125)

It is likely still not perfect and I *highly* recommend checking that 1) Sum of inputs match sum of inputs 2) Inputs and outputs are what you expect.

There is currently a known bug where the splitters siphoning of x amount of items are getting deleted during simplification, therefore causing the output to be wrong. 
In that case, try removing it manually and/or setting MK to 0. You can get how much it's trying to take off by calling the fraction_smart_ratio() in a python console. (`python` or `python -i conveyor_nodes.py`)


## Planned Additions & Contributing
There's only two more things I'm really considering adding to this project. Those being 1) Being able to set how many belts can converge on one merger, and 2) Being able to take N inputs to M outputs.
Besides that and polishing, I don't plan to do anything else.

I don't really have experience collaborating through GitHub but you are welcome to submit a pull request. Good luck though, I tried keeping it clean, but some places are better than others and documentation / comments still need some work. (I'll get to it eventually (probably)).

## License
[MIT](https://choosealicense.com/licenses/mit/)