import { DataFrame, getFieldDisplayName } from '@grafana/data';
import { log_debug } from './misc_utils';
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

export function downSampleData(timestamps: number[], dataAndTS: number[][], override: { summaryType: string }) {
  let val = 0;
  return function (ts: number, tsIndex: number) {
    let nextTs: null | number = null;
    if (tsIndex + 1 < timestamps.length) {
      nextTs = timestamps[tsIndex + 1];
    }
    let values = dataAndTS
      .filter(function (point) {
        return point[0] >= ts && (nextTs == null || point[0] < nextTs);
      })
      .map(function (point) {
        return point[1];
      });

    if (values.length === 0) {
      if (tsIndex === 0 || nextTs === null) {
        return null;
      }
      // Potentially extrapolate some points but it's not clear why we should do that
      let lastTS = timestamps[tsIndex - 1];
      values = dataAndTS
        .filter(function (point) {
          return point[0] >= lastTS && point[0] < ts;
        })
        .map(function (point) {
          return point[1];
        });

      if (values.length === 0) {
        return null;
      }
    }

    if (override.summaryType === 'sum') {
      val = sumValues(values);
    } else if (override.summaryType === 'min') {
      val = minValue(values);
    } else if (override.summaryType === 'max') {
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
  let matching = series.filter((s: DataFrame) => {
    if (s.length < 2) {
      return false;
    }
    for (let j = 1; j < s.fields.length; j++) {
      if (getFieldDisplayName(s.fields[j], s) === name) {
        return true;
      }
    }
    return false;
  });
  if (matching.length === 0) {
    return null;
  }
  let fields = matching.map((s, i) => {
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
  downSample: boolean
) {
  if (serie.length > 0) {
    //TODO fix for series with more than one value
    let name = getFieldDisplayName(serie.fields[1], serie);
    return context.metric(function (start: number, stop: number, step: number, callback: any) {
      let dataPoints: number[] = serie.fields[1].values;
      let dataPointsTS: number[] = serie.fields[0].values;
      let values: Array<number | null> = [];
      let override = { summaryType: 'avg' };
      let dataAndTS = dataPointsTS.map((item, index) => [item, dataPoints[index]]);
      if (downSample) {
        values = _.chain(timestamps).map(downSampleData(timestamps, dataAndTS, override)).value();
      } else {
        values = _.chain(timestamps).map(upSampleData(dataPoints, dataPointsTS)).value();
      }
      callback(null, values);
    }, name);
  } else {
    return null;
  }
}

export function convertAllDataToCubism(series: DataFrame[], cubismTimestamps: number[], context: any, step: number) {
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

  let downsample = false;
  // if there is too much missing points (ie. p99 has has at least 3x the smallest step then force
  // downsample because upSample will not give good results
  if (stepRatio > 3 || s.fields[0].values.length > cubismTimestamps.length) {
    downsample = true;
  }
  log_debug(
    `downsample = ${downsample} v[index] = ${v[index]} stepRatio = ${stepRatio} index = ${index}, step = ${step}`
  );

  return series.map(function (serie, serieIndex) {
    const fnc = convertDataToCubism(serie, serieIndex, cubismTimestamps, context, downsample);
    return fnc;
  });
}
