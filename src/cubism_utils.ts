import { DataFrame, getFieldDisplayName } from '@grafana/data';
import * as cubism from 'cubism-es';
import _ from 'lodash';

function linearExtrapolation(point1: number[], point2: number[], ts: number): number {
  let slope = (point2[1] - point1[1]) / (point2[0] - point1[0]);
  // a.x + b = y
  let offset = point2[1] - slope * point2[0];

  return offset + slope * ts;
}

export function genGrafanaMetric(
  grafanaTS: number[],
  dataAndTS: number[][],
  rangeFunction: { summaryType: string },
  tsInterval: number
): (ts: number, tsIndex: number) => number | null {
  let val = 0;
  return function (ts: number, tsIndex: number): number | null {
    let nextTs: null | number = null;
    let values = [];
    let cur_cb_ix = 0;
    if (tsIndex + 1 < grafanaTS.length) {
      nextTs = grafanaTS[tsIndex + 1];
    }
    const lastTs = grafanaTS[grafanaTS.length - 1];
    while (nextTs == null || dataAndTS[cur_cb_ix][0] < nextTs) {
      if (dataAndTS[cur_cb_ix][0] >= ts) {
        values.push(dataAndTS[cur_cb_ix][1]);
      }
      if (cur_cb_ix < dataAndTS.length - 1) {
        cur_cb_ix++;
      } else {
        break;
      }
    }

    if (values.length === 0 && dataAndTS.length > 1) {
      if (cur_cb_ix < dataAndTS.length && cur_cb_ix > 0 && dataAndTS[cur_cb_ix][0] > ts) {
        // If we don't have any values for the ts where we are trying to display
        // we check if the next data point that we have is tsInterval away from the last one (tsInterval
        //  is the interval in ms specified in our data source, aka how often we should
        //  have a data point if there is one).
        //  cur_cb_ix is pointing to the next data point to be evaluated
        if (dataAndTS[cur_cb_ix][0] - dataAndTS[cur_cb_ix - 1][0] <= tsInterval) {
          values.push(linearExtrapolation(dataAndTS[cur_cb_ix], dataAndTS[cur_cb_ix - 1], ts));
          //values.push(dataAndTS[tmp_ix][1]);
          /*} else {
          console.log(dataAndTS[tmp_ix + 1][0] - dataAndTS[tmp_ix][0]);
          console.log(new Date(ts));
        */
        }
      } else if (
        cur_cb_ix === dataAndTS.length - 1 &&
        dataAndTS[cur_cb_ix][0] < ts &&
        lastTs - dataAndTS[cur_cb_ix][0] < tsInterval
      ) {
        values.push(linearExtrapolation(dataAndTS[cur_cb_ix], dataAndTS[cur_cb_ix - 1], ts));
      }
    }

    if (values.length === 0) {
      return null;
    }
    if (rangeFunction.summaryType === 'sum') {
      val = sumValues(values);
    } else if (rangeFunction.summaryType === 'min') {
      val = minValue(values);
    } else if (rangeFunction.summaryType === 'max') {
      val = maxValue(values);
    } else {
      val = averageValues(values);
    }
    return val;
  };
}

export function sumValues(values: number[]) {
  return values.reduce(function (a, b) {
    return a + b;
  });
}

export function averageValues(values: number[]) {
  let sum = values.reduce(function (a, b) {
    return a + b;
  });
  return sum / values.length;
}

export function maxValue(values: number[]) {
  return values.reduce(function (a, b) {
    return Math.max(a, b);
  });
}

export function minValue(values: number[]) {
  return values.reduce(function (a, b) {
    return Math.min(a, b);
  });
}

export function getSerieByName(series: DataFrame[], name: string) {
  if (series.length === 0) {
    return null;
  }
  let fields = series.map((s, i) => {
    if (s.length < 2) {
      return null;
    }
    for (let j = 1; j < s.fields.length; j++) {
      if (getFieldDisplayName(s.fields[j], s) === name) {
        return s.fields[j];
      }
    }
    return null;
  });
  fields = fields.filter((f) => f !== null);
  if (fields.length === 1) {
    return fields[0];
  }
  return null;
}
// Take an array of timestamps that map to the way we want to display the timeseries in grafana
// take also a serie
export function convertDataToCubism(
  serie: DataFrame,
  serieIndex: number,
  timestamps: number[],
  context: any
): cubism.Metric | null {
  if (serie.length > 0 && serie.fields.length > 1) {
    //TODO fix for series with more than one value
    let name = getFieldDisplayName(serie.fields[1], serie);
    return context.metric(function (start: number, stop: number, step: number, callback: any) {
      let dataPoints: number[] = serie.fields[1].values;
      let dataPointsTS: number[] = serie.fields[0].values;
      let values: Array<number | null> = [];
      let override = { summaryType: 'avg' };
      let dataAndTS = dataPointsTS.map((item, index) => [item, dataPoints[index]]);
      values = _.chain(timestamps)
        .map(genGrafanaMetric(timestamps, dataAndTS, override, serie.fields[0].config.interval!))
        .value();
      callback(null, values);
    }, name);
  } else {
    return null;
  }
}

export function convertAllDataToCubism(
  series: DataFrame[],
  cubismTimestamps: number[],
  context: any,
  step: number
): cubism.Metric[] {
  if (series.length === 0) {
    return [null];
  }

  return series.map(function (serie, serieIndex) {
    const fnc = convertDataToCubism(serie, serieIndex, cubismTimestamps, context);
    return fnc;
  });
}
