import { DataFrame, getFieldDisplayName } from '@grafana/data';
import { SamplingType } from 'types';
import { log_debug } from './misc_utils';
import * as cubism from 'cubism-es';
import _ from 'lodash';

// Take the datapoints of the timeseries and its associated timestamps
export function upSampleData(dataPoints: number[], dataPointsTS: number[]) {
  let pointIndex = 0;
  return function (ts: number, tsIndex: number) {
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
  };
}

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
  context: any,
  samplingType: SamplingType
): cubism.Metric | null {
  if (serie.length > 0) {
    //TODO fix for series with more than one value
    let name = getFieldDisplayName(serie.fields[1], serie);
    return context.metric(function (start: number, stop: number, step: number, callback: any) {
      let dataPoints: number[] = serie.fields[1].values;
      let dataPointsTS: number[] = serie.fields[0].values;
      let values: Array<number | null> = [];
      let override = { summaryType: 'avg' };
      let dataAndTS = dataPointsTS.map((item, index) => [item, dataPoints[index]]);
      if (samplingType === SamplingType.Downsample) {
        values = _.chain(timestamps)
          .map(genGrafanaMetric(timestamps, dataAndTS, override, serie.fields[0].config.interval!))
          .value();
      } else if (samplingType === SamplingType.Upsample) {
        values = _.chain(timestamps).map(upSampleData(dataPoints, dataPointsTS)).value();
      } else {
        throw new Error(`SamplingType ${samplingType} is not allowed for convertDataToCubism`);
      }
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
  step: number,
  samplingType: SamplingType
): cubism.Metric[] {
  if (series.length === 0) {
    return [null];
  }
  let longest = series[0].length;
  let longestIndex = 0;

  for (let i = 1; i < series.length; i++) {
    if (series[i].length > longest) {
      longest = series[i].length;
      longestIndex = i;
    }
  }
  // Let's look at the longest one, if the step is bigger than what we have in the serie we downsample
  const name = 'Time';
  let s = series[longestIndex];
  let ts = s.fields.filter(function (v) {
    return v.name === name ? true : false;
  })[0];
  let previousts = -1;
  let v: number[] = [];
  if (ts === undefined) {
    log_debug(`Couldn't find a field with name ${name} using field 0`);
    if (s.fields.length > 0) {
      ts = s.fields[0];
    } else {
      return series.map(function (serie, serieIndex) {
        return null;
      });
    }
  }
  log_debug(`There is ${ts.values.length} elements in the longest`);
  for (let i = 0; i < ts.values.length; i++) {
    if (previousts !== -1) {
      v.push(ts.values[i] - previousts);
    }
    previousts = ts.values[i];
  }
  v.sort((a: number, b: number) => a - b);

  // Calculate the index for P99
  const index = Math.ceil(0.99 * v.length) - 1;
  // Look at what is the ratio when comparing the smallest step (ie. when we have most of the data
  // to the largest (ie. when there is gaps), if the ratio is more than 3 we will
  // downsample because it means that there is massive gaps
  const stepRatio = v[index] / v[0];

  if (samplingType === SamplingType.Auto) {
    // if there is too much missing points (ie. p99 has has at least 3x the smallest step then force
    // downsample because upSample will not give good results
    if (stepRatio > 3 || s.fields[0].values.length > cubismTimestamps.length) {
      samplingType = SamplingType.Downsample;
    } else {
      samplingType = SamplingType.Upsample;
    }
  }

  log_debug(
    `sampling = ${samplingType} v[index] = ${v[index]} stepRatio = ${stepRatio} index = ${index}, step = ${step}`
  );

  return series.map(function (serie, serieIndex) {
    const fnc = convertDataToCubism(serie, serieIndex, cubismTimestamps, context, samplingType);
    return fnc;
  });
}
