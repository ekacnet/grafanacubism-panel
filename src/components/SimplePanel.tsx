import React from 'react';
import { PanelProps, PanelData, DataFrame } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2} from '@grafana/ui';
import * as cubism from 'cubism-es';
import * as d3 from 'd3';
import _ from 'lodash';

import { config } from '@grafana/runtime';
if (config.theme2.isDark) {
  require('../sass/cubism_dark.scss');
} else {
  require('../sass/cubism_light.scss');

}

interface Props extends PanelProps<SimpleOptions> {}

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Open Sans;
      position: relative;
      overflow: hidden;
    `,
    d3inner: css`
      overflow: auto;
      height: calc(100% - 2rem);
    `,
    d3outer: css`
      height: calc(100% - 2rem);
    `,
    svg: css`
      position: absolute;
      top: 0;
      left: 0;
    `,
    textBox: css`
      max-height: 2em;
      padding: 5px;
    `,
  }
};

function convertDataToCubism(series: DataFrame, seriesIndex: number, timestamps: number[], context: any) {
  return context.metric(function (start: number, stop: number, step: number, callback: any) {
    let dataPoints: number[] = series.fields[1].values;
    let dataPointsTS: number[] = series.fields[0].values;
    let values: number[] = [];
    if (timestamps.length === dataPoints.length) {
      values = dataPoints.map(function (point: number) {
          return point;
        });
    } else if (timestamps.length > dataPoints.length) {
      let pointIndex = 0;
      values = _.chain(timestamps)
        .map(
          function (ts: number, tsIndex: number) {
            let point = dataPoints[pointIndex];
            let nextPoint = null;
            let nextPointTS = null;
            if (pointIndex + 1 < dataPoints.length) {
              nextPoint = dataPoints[pointIndex + 1];
              nextPointTS = dataPointsTS[pointIndex + 1];
            }
            if (nextPointTS == null || ts < nextPointTS) {
              return point;
            } else {
              pointIndex++;
              return nextPoint!;
            }
          }
        )
        .value();
    } else {
      let override = { summaryType: "avg"};
      let dataAndTS= dataPointsTS.map((item, index) => [item, dataPoints[index]]);
      values = _.chain(timestamps)
        .map(
          function (ts: number, tsIndex: number) {
            let nextTs: null|number = null;
            if (tsIndex + 1 < timestamps.length) {
              nextTs = timestamps[tsIndex + 1];
            }
            let values = dataAndTS
              .filter(function (point) {
                return point[0] >= ts && (nextTs == null || point[1] < nextTs);
              })
              .map(function (point) {
                return point[1];
              });
            if (override.summaryType === "sum") {
              return sumValues(values)
            } else if (override.summaryType === "min") {
              return minValue(values)
            } else if (override.summaryType === "max") {
              return maxValue(values)
            } else {
              return averageValues(values)
            }
          }
        )
        .value();
    }
    callback(null, values)
  }, series.fields[1].name);
}

function sumValues(values: number[]) {
    return values.reduce(function (a, b) {
      return a + b;
    }, 0);
}

function averageValues(values: number[]) {
  let sum = values.reduce(function (a, b) {
    return a + b;
  }, 0);
  return sum / values.length;
}

function maxValue(values: number[]) {
  return values.reduce(function (a, b) {
    return Math.max(a, b);
  }, 0);
}

function minValue(values: number[]) {
  return values.reduce(function (a, b) {
    return Math.min(a, b);
  }, 0);
}
export const D3Graph: React.FC<{height: number; width: number, data: PanelData, options: any, className: string, innerClassName: string} > = ({height, width,  data, options, className, innerClassName}) => {

  // it's not quite clear what's the exact effect of this
  const theme = useTheme2();
  let context = cubism.context();

  const renderD3 = React.useCallback((div: HTMLDivElement | null) => {
    if (data.series.length === 0) {
      return
    }
    const anHour = 60 * 60 * 1000;
    const aDay = 24 * anHour;
    const aWeek = 7 * aDay;
    const aMonth = 4 * aWeek;
    let firstSeries = data.series[0].fields[0].values;
    let earliest = firstSeries[0];
    let latest = firstSeries[firstSeries.length - 1];
    let span = latest - earliest;
    if (!div) {
      return;
    }
    let size = div.clientWidth
    // the width of the div with the panel
    let step = Math.floor(span/size);
    let cubismTimestamps: number[] = [];
    for (let ts = earliest; ts <= latest; ts = ts + step) {
      cubismTimestamps.push(ts);
    }
    console.log("Step is:", step);
    console.log("Length of timestamps is ", cubismTimestamps.length);

    let cubismData = data.series.map(function (series, seriesIndex) {
      return convertDataToCubism(series, seriesIndex, cubismTimestamps, context)
     });

    div.innerHTML = '';
    div.className = 'd3outer '+className;

    // size seems to be more the nubmer of pix
    // steps seems to be how often things things change in microseconds ?
    // it also control the range (ie. given the number of pixel and that a pixel reprensent 1e3 milliseconds, the range is 1e3 * size seconds)
    context.size(size).step(step);

    const innnerDiv = d3.create('div');
    const axisDiv= d3.create('div');
    innnerDiv.node()!.className = innerClassName;

    // create axis: try to find the 
    axisDiv.selectAll(".axis")
      .data(["bottom"])
      .enter().append("div")
      .attr("class", function(dataValue) { return dataValue + " axis"; })
      .each(function(dataValue) {

          let scale = d3.timeHour;
          let count = 6;
          if (span < 2 * anHour) {
            scale = d3.timeMinute;
            count = 15;
          } else if (span < 12 * anHour) {
            scale = d3.timeHour;
            count = 1;
          } else if (span < aDay) {
            scale = d3.timeHour;
            count = 3;
          } else if (span < 2 * aDay) {
            scale = d3.timeHour;
            count = 6;
          } else if (span < 2 * aWeek) {
            scale = d3.timeDay;
            count = 1;
          } else if (span < 2 * aMonth) {
            scale = d3.timeDay;
            count = 2;
          }
        context.axis()
               .ticks(scale, count)
               .orient(dataValue)
               .render(d3.select(this));
      });


    // create the rule
    const ruleDiv = innnerDiv.append("div").attr("class", "rule").attr("background-color", theme.colors.primary.main).attr("id", "rule");
    context.rule().render(ruleDiv);

    // create the horizon
    const h = innnerDiv.selectAll(".horizon")
                .data(cubismData)
                .enter().insert("div", ".bottom")
                .attr("class", "horizon");


    // extent is the vertical range for the values for a given horinzon
    context.horizon()
          .extent([options.extentMin, options.extentMax])
          .render(h);

    // mouse thingy is not yet working 
    context.on("focus", function(i: number) {
      if (i === null) {
        return;
      }
      innnerDiv.selectAll(".value").style("right", context.size() - i + "px");
    });


    div.append(innnerDiv.node()!);
    div.append(axisDiv.node()!);
  }, [theme.colors.primary.main, context, data, options, className, innerClassName]);
  return <div  ref={renderD3} />;
};

/*
const validatePanelSpace = (panelUsefulHeight: number, bottomLabelClass: string, dataLength: number): [number, string|null] =>{
  let context = cubism.context();
  // cubism-es is not exposing (yet) a method to figure out the height
  // of the axis, the formula is `Math.max(28, -_axis.tickSize())` it seems
  // likely it will be 28 for the forseeable futur
  const AXISHEIGHT = 28
  // Find the node for the sibbling element in the DOM
  let n = d3.select(div.parentElement!).selectAll("."+bottomLabelClass).node()!
  let sibblingHeight = (n as Element).getBoundingClientRect().height;
  let availVSpace = panelUsefulHeight - sibblingHeight - AXISHEIGHT 
  let horizHeight = context.horizon().height()
  let availHorizon = Math.floor(availVSpace/horizHeight);

  if (availHorizon < dataLength) {
    return [availHorizon, "Not enough space to display all the series"];
  }
  return [availHorizon, null];
}
*/

export const SimplePanel: React.FC<Props> = ({ options, data, width, height }) => {
  const styles = useStyles2(getStyles);
  //let mymsgdiv = ....
  //let [nbHorizons, msg] = validatePanelSpace(height, styles.textBox, data.series.length);
  let msg = "WIP put here some interesting text (eventually): {options.text} "

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <D3Graph
          height={height}
          width={width}
          data={data}
          options={options}
          className = {styles.d3outer}
          innerClassName = {styles.d3inner}
      />
      <div className={styles.textBox}>
        {options.showSeriesCount && <div>Number of series: {data.series.length}</div>}
          <div>{msg}</div>
      </div>
    </div>
  );
};
