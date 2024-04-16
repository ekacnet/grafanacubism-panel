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
