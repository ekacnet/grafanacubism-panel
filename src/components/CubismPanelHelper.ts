import { CubismOptions } from 'types';
import * as cubism from 'cubism-es';
import * as d3 from 'd3';

import { PanelData } from '@grafana/data';
import { convertAllDataToCubism } from '../cubism_utils';
import { log_debug } from '../misc_utils';
import { calculateSecondOffset } from '../date_utils';

type CSS = string;

interface CSSStyles {
  [key: string]: CSS;
}

export const D3GraphRender = (
  context: cubism.Context,
  data: PanelData,
  options: CubismOptions,
  styles: CSSStyles
): ((wrapperDiv: HTMLDivElement | null) => void) => {
  return (panelDiv: HTMLDivElement | null) => {
    if (!panelDiv || data.series.length === 0) {
      return;
    }
    // Initialize most of the variables and constants
    let showText = false;

    if (options.text !== undefined && options.text !== null && options.text !== '') {
      showText = true;
    }
    log_debug('Show text is ', showText);
    let now = Date.now();
    let begin = new Date();
    const request = data.request!;

    const start = +request.range.from;
    const end = +request.range.to;
    const span = end - start;

    const anHour = 60 * 60 * 1000;
    const aDay = 24 * anHour;
    const aWeek = 7 * aDay;
    const aMonth = 4 * aWeek;

    // the width of the div with the panel
    let size = panelDiv.clientWidth;

    let step = Math.floor(span / size);

    let cubismTimestamps: number[] = [];

    for (let ts = start; ts <= end; ts = ts + step) {
      cubismTimestamps.push(ts);
    }
    log_debug('Step is:', step);
    log_debug('Length of timestamps is ', cubismTimestamps.length);
    log_debug('Size of the graph is ', size);

    panelDiv.innerHTML = '';
    panelDiv.className = styles['cubism-panel'];
    if (data.series.length === 0) {
      panelDiv.innerHTML = 'The series contained no data, check your query';
      return;
    }
    let cubismData = convertAllDataToCubism(data.series, cubismTimestamps, context, step);

    cubismData = cubismData.filter(function (el) {
      if (el !== null) {
        return el;
      }
    });

    let prev = +now;
    now = Date.now();
    log_debug(`Took ${now - prev} to convert the series`);

    if (cubismData.length === 0) {
      panelDiv.innerHTML = 'The series contained no data, check your query';
      return;
    }

    // setup Div layout and set classes
    const delta = calculateSecondOffset(begin, +end, request.timezone, request.range.from.utcOffset());
    const cubismGraphDiv = d3.create('div');
    cubismGraphDiv.node()!.className = styles['cubismgraph'];

    const axisDiv = d3.create('div');
    const canvasDiv = d3.create('div');
    canvasDiv.node()!.className = styles['canvas'];

    // setup the context
    // size is the nubmer of pixel
    // steps seems to be the number of microseconds between change
    // it also control the range (ie. given the number of pixel and that a
    // pixel represent 1e3 milliseconds, the range is 1e3 * size seconds)
    context.size(size).step(step);
    context.serverDelay(delta * 1000);
    // negative delta means that we go in the past ...
    context.stop();
    context.setCSSClass('horizon', styles['horizon']);
    context.setCSSClass('line', styles['line']);
    context.setCSSClass('title', styles['title']);
    context.setCSSClass('value', styles['value']);

    /*
      .attr('className', function (dataValue) {
        return dataValue + ' ' + styles['axis'];
      })
      */
    // create axis: try to find divs with .axis class
    axisDiv
      .selectAll('.' + styles['axis'])
      .data(['bottom'])
      .enter()
      .append('div')
      .attr('class', styles['axis'])
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
        d3.select(this).attr('class', `${styles['axis']} bottom`);
      });
    prev = now;
    now = Date.now();
    log_debug(`Took ${now - prev} ms to do the axis`);

    // create the horizon
    const h = canvasDiv
      .selectAll(styles['horizon'])
      .data(cubismData)
      .enter()
      .insert('div', '.bottom')
      .attr('class', styles['horizon']);

    // create the rule
    const ruleDiv = canvasDiv.append('div').attr('class', `${styles['rule']}`).attr('id', 'rule');
    context.rule().render(ruleDiv);

    // extent is the vertical range for the values for a given horinzon
    if (options.automaticExtents || options.extentMin === undefined || options.extentMax === undefined) {
      context.horizon().render(h);
    } else {
      context.horizon().extent([options.extentMin, options.extentMax]).render(h);
    }

    context.on('focus', function (i: number) {
      if (i === null) {
        canvasDiv.selectAll('.value').style('right', null);
      } else {
        const rightStyle: string = context.size() - i + 'px';
        canvasDiv.selectAll('.value').style('right', rightStyle);
      }
    });

    cubismGraphDiv.node()!.append(canvasDiv.node()!);
    cubismGraphDiv.node()!.append(axisDiv.node()!);
    panelDiv.append(cubismGraphDiv.node()!);

    if (options.text !== undefined && options.text !== null && options.text !== '') {
      log_debug('showing text');
      let msg = `${options.text}`;
      const msgDivContainer = d3.create('div');
      msgDivContainer.node()!.className = styles['textBox'];
      msgDivContainer.append('div').text(msg);
      panelDiv.append(msgDivContainer.node()!);
    }
    prev = now;
    now = Date.now();
    log_debug(`Took ${now - prev} ms to finish`);
    return;
  };
};
