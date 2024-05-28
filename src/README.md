# Cubism graph

A panel to display [cubism](https://square.github.io/cubism) like graph in grafana.

## Overview / Introduction
Cubism is a way of representing information dense graphs in a limited amount of spaces, let's imagine you want to display the volume of 5xx errors that you are facing for each of the regions of your cloud provider.

The goto way is to do a regular graph with one serie per region, but if the volume are different across region you might be missing out something happening on lower volume region.

Cubism graph solve that by giving each serie its own horizon and by representing the increase of the metric by a darker color, if all of a sudden the region A is getting much darker you know right away that something is happening there.

Something similar to this graph:

![cubism graph](https://raw.githubusercontent.com/ekacnet/grafanacubism-panel/main/src/img/screenshot.png)


## Requirements

Grafana 10.3 is required to install this plugin.

## Getting Started

1. Create a new visualization widget
2. Create the query that you want to display
3. On the right hand side click on time series and search for Cubism graph

And you should get a cubism graph.

## Options

The plugin support the following settings

### Automatic sampling type
The plugin tries very hard to figure out if upsampling, aka generating datapoints that don't exists, is needed or downsampling is needed (ie. there is too many points and so it needsto average the different values). By default it's enabled but if you want more control on a given graph on how the sampling is done feel free to change it to off.

### Upsample or downsample datapoints
If the previous setting is disabled, you will have a choice to either upsample (not enabled) or downsample (enabled) the data. Upsampling is useful if you try to zoom heavily on a graph and there is not enough datapoints to render a datapoint for each pixel of the graph, in this case it will generate intermediate datapoints.
The main issue with upsampling is that if there is large gaps before, after or within the metric you will have fake datapoints and see a "smear" like visual artifact.

Downsample is usually a safe choice but could lead to unpleasant visual graph if the resolution of the metric is not enough for the graph. In an extreme situation where the graph is 600px large for 5 minutes, each pixel represent 0.5s and if the metric has a resolution of 15s (ie. one datapoint every 15s) there will be 29 dark pixel between each point.

### Let Cubism calculate the extents automatically
Extents (maximum and minimum) correspond to the highest (respectively lowest) value associated with the darkest color, then the range between 0 and this value is divided in 5 bands each associated with a progressively darker color.
By default cubism figures out the highest (resp. lowest) value in each serie if this setting is enabled.
Disabling it allows you to set mininum value of the extent and the maximum one, those settings are accross all the series in the graph. Obviously any value that is above the maximum extent will still be represented in the darkest color, for instance setting the maximum to 100 will create 5 bands (0-20, 21-40, 41-60, 61-80, 81-100) and so a value of 200 would have the same color than 81 or 99.

### Bottom label
Allows you to display a text at the bottom of the graph. This is your moment to be creative !

### Data Links

As for other graphs you can create multiple links and use variables, currently only `{__field.labels}` variables are supported.
Although you can create multiple links only the first one is used, see Zooming to see more.

## Zooming

Cubism graphs support zooming but not the traditional way other graph support it, there is little value to visualize a 15 minutes slice of a 3 hours graph in the cubism graph.
Cubism graphs are meant to give you a bird eye view, and quickly notice that something is wrong but then from there you want to dive to analyze what's the root cause of the problem.

That's why zooming in cubism graph uses the first data link defined on the graph (others are ignored) and will open the link as a way of diving into a particular issue, it will uses the labels associated with the serie (ie. instance, hostname, app_name, ...) to replace variables that are defined on the url of the data link.


## Contributing
Look at the [grafanacubism-panel](https://github.com/ekacnet/grafanacubism-panel) project on Github to see how you can help
<!--


**ADD SOME BADGES**

Badges convey useful information at a glance for users whether in the Catalog or viewing the source code. You can use the generator on [Shields.io](https://shields.io/badges/dynamic-json-badge) together with the Grafana.com API
to create dynamic badges that update automatically when you publish a new version to the marketplace.

- For the logo field use 'grafana'.
- Examples (label: query)
  - Downloads: $.downloads
  - Catalog Version: $.version
  - Grafana Dependency: $.grafanaDependency
  - Signature Type: $.versionSignatureType

Full example: ![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.version&url=https://grafana.com/api/plugins/grafana-polystat-panel&label=Marketplace&prefix=v&color=F47A20)

Consider other [badges](https://shields.io/badges) as you feel appropriate for your project.

-->
