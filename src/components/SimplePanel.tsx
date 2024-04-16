import React from 'react';
import { PanelProps, PanelData } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';
import * as cubism from 'cubism-es';
import * as d3 from 'd3';

import { config } from '@grafana/runtime';
import { convertDataToCubism } from '../cubism_utils';

if (config.theme2.isDark) {
  require('../sass/cubism_dark.scss');
} else {
  require('../sass/cubism_light.scss');
}

function log_debug(message?: any, ...optionalParams: any[]): void {
  // Set it to true to enable debugging
  let debug = false;
  if (debug) {
    return console.log(message, optionalParams);
  }
}

interface Props extends PanelProps<SimpleOptions> {}

type CSS = string;

type Styles = {
  wrapper: CSS;
  d3inner: CSS;
  d3outer: CSS;
  svg: CSS;
  textBox: CSS;
};

const getStyles = (showText: boolean): (() => Styles) => {
  return function () {
    // 28px is the height of the axis
    let innerheight = 'calc(100% - 28px)';
    let outerheight = '100%';
    if (showText) {
      outerheight = 'calc(100% - 2em)';
    }
    return {
      wrapper: css`
        height: 100%;
        font-family: Open Sans;
        position: relative;
        overflow: hidden;
      `,
      d3inner: css`
        overflow: auto;
        height: ${innerheight};
      `,
      d3outer: css`
        position: relative;
        height: ${outerheight};
        overflow: hidden;
      `,
      svg: css`
        position: absolute;
        top: 0;
        left: 0;
      `,
      textBox: css`
        max-height: 2em;
      `,
    };
  };
};

export const D3Graph: React.FC<{
  height: number;
  width: number;
  data: PanelData;
  options: SimpleOptions;
  stylesGetter: Styles;
}> = ({ height, width, data, options, stylesGetter }) => {
  const theme = useTheme2();
  let context = cubism.context();

  const renderD3 = React.useCallback(
    (wrapperDiv: HTMLDivElement | null) => {
      if (!wrapperDiv || data.series.length === 0) {
        return;
      }
      const anHour = 60 * 60 * 1000;
      const aDay = 24 * anHour;
      const aWeek = 7 * aDay;
      const aMonth = 4 * aWeek;
      let firstSeries = data.series[0].fields[0].values;
      let earliest = firstSeries[0];
      let latest = firstSeries[firstSeries.length - 1];
      let span = latest - earliest;
      let size = wrapperDiv.clientWidth;
      // the width of the div with the panel
      let step = Math.floor(span / size);
      let cubismTimestamps: number[] = [];

      for (let ts = earliest; ts <= latest; ts = ts + step) {
        cubismTimestamps.push(ts);
      }
      log_debug('Step is:', step);
      log_debug('Length of timestamps is ', cubismTimestamps.length);

      let cubismData = data.series.map(function (series, seriesIndex) {
        return convertDataToCubism(series, seriesIndex, cubismTimestamps, context);
      });
      cubismData = cubismData.filter(function (el) {
        if (el !== null) {
          return el;
        }
      });

      wrapperDiv.innerHTML = '';
      wrapperDiv.className = stylesGetter.wrapper;

      if (cubismData.length === 0) {
        wrapperDiv.innerHTML = 'The series contained no data, check your query';
        return;
      }
      const outerDiv = d3.create('div');
      outerDiv.node()!.className = stylesGetter.d3outer;
      // size seems to be more the nubmer of pix
      // steps seems to be how often things things change in microseconds ?
      // it also control the range (ie. given the number of pixel and that a
      // pixel reprensent 1e3 milliseconds, the range is 1e3 * size seconds)
      context.size(size).step(step);
      // @ts-ignore
      context.stop();

      const innnerDiv = d3.create('div');
      const axisDiv = d3.create('div');
      innnerDiv.node()!.className = stylesGetter.d3inner;

      // create axis: try to find divs with .axis class
      axisDiv
        .selectAll('.axis')
        .data(['bottom'])
        .enter()
        .append('div')
        .attr('class', function (dataValue) {
          return dataValue + ' axis';
        })
        .each(function (dataValue) {
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
          context.axis().ticks(scale, count).orient(dataValue).render(d3.select(this));
        });

      // create the horizon
      const h = innnerDiv
        .selectAll('.horizon')
        .data(cubismData)
        .enter()
        .insert('div', '.bottom')
        .attr('class', 'horizon');

      // create the rule
      const ruleDiv = innnerDiv
        .append('div')
        .attr('class', 'rule')
        .attr('background-color', theme.colors.primary.main)
        .attr('id', 'rule');
      context.rule().render(ruleDiv);
      // extent is the vertical range for the values for a given horinzon
      if (options.automaticExtents || options.extentMin === undefined || options.extentMax === undefined) {
        context.horizon().render(h);
      } else {
        context.horizon().extent([options.extentMin, options.extentMax]).render(h);
      }

      context.on('focus', function (i: number) {
        if (i === null) {
          return;
        }
        innnerDiv.selectAll('.value').style('right', context.size() - i + 'px');
      });

      outerDiv.node()!.append(innnerDiv.node()!);
      outerDiv.node()!.append(axisDiv.node()!);
      wrapperDiv.append(outerDiv.node()!);

      if (options.text !== undefined && options.text !== null && options.text !== '') {
        log_debug('showing text');
        let msg = `${options.text}`;
        const msgDivContainer = d3.create('div');
        msgDivContainer.node()!.className = stylesGetter.textBox;
        msgDivContainer.append('div').text(msg);
        wrapperDiv.append(msgDivContainer.node()!);
      }
    },
    [theme.colors.primary.main, context, data, options, stylesGetter]
  );

  return <div ref={renderD3} />;
};

export const SimplePanel: React.FC<Props> = ({ options, data, width, height }) => {
  let showText = false;

  if (options.text !== undefined && options.text !== null && options.text !== '') {
    showText = true;
  }
  log_debug('Show text is ', showText);
  const styles = useStyles2(getStyles(showText));

  return (
    <div
      className={cx(
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <D3Graph height={height} width={width} data={data} options={options} stylesGetter={styles} />
    </div>
  );
};
