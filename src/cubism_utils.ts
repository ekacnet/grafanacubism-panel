import { DataFrame, getFieldDisplayName } from '@grafana/data';
import * as cubism from 'cubism-ng';

function linearExtrapolation(point1: number[], point2: number[], ts: number): number {
  let slope = (point2[1] - point1[1]) / (point2[0] - point1[0]);
  // a.x + b = y
  let offset = point2[1] - slope * point2[0];

  return offset + slope * ts;
}

// Returns a stateful function for mapping sequential timestamps to aggregated values.
// The returned function MUST be called with monotonically non-decreasing tsIndex
// (as happens naturally in timestamps.map(...)); out-of-order calls will produce
// incorrect results because the internal cursor does not rewind.
export function genGrafanaMetric(
  grafanaTS: number[],
  dataAndTS: number[][],
  rangeFunction: { summaryType: string },
  tsInterval: number
): (ts: number, tsIndex: number) => number | null {
  // Cursor into dataAndTS, shared across calls so we scan the data once (O(n)) instead
  // of restarting from 0 on every timestamp (O(n²)).
  let cur_cb_ix = 0;
  return function (ts: number, tsIndex: number): number | null {
    let nextTs: null | number = null;
    let values: number[] = [];
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
    switch (rangeFunction.summaryType) {
      case 'sum':
        return sumValues(values);
      case 'min':
        return minValue(values);
      case 'max':
        return maxValue(values);
      default:
        return averageValues(values);
    }
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

// Returns the unique field across all series with the given display name.
// If zero or more than one field matches, returns null (ambiguous names are rejected).
export function getSerieByName(series: DataFrame[], name: string) {
  let match = null;
  for (const s of series) {
    if (s.length < 2) {
      continue;
    }
    for (let j = 1; j < s.fields.length; j++) {
      if (getFieldDisplayName(s.fields[j], s) === name) {
        if (match !== null) {
          return null; // ambiguous — multiple fields share this display name
        }
        match = s.fields[j];
      }
    }
  }
  return match;
}
// Take an array of timestamps that map to the way we want to display the timeseries in grafana
// take also a serie
export function convertDataToCubism(
  serie: DataFrame,
  serieIndex: number,
  timestamps: number[],
  context: any
): cubism.Metric | null {
  if (serie.length === 0 || serie.fields.length < 2) {
    return null;
  }
  // TODO: support series with more than one value field
  const name = getFieldDisplayName(serie.fields[1], serie);
  const dataPoints: number[] = serie.fields[1].values;
  const dataPointsTS: number[] = serie.fields[0].values;
  const tsInterval = serie.fields[0].config.interval!;
  const override = { summaryType: 'avg' };
  // Zip once at registration time, not on every cubism poll.
  const dataAndTS = dataPointsTS.map((item, index) => [item, dataPoints[index]]);

  return context.metric(function (start: number, stop: number, step: number, callback: any) {
    const values = timestamps.map(genGrafanaMetric(timestamps, dataAndTS, override, tsInterval));
    callback(null, values);
  }, name);
}

export function convertAllDataToCubism(
  series: DataFrame[],
  cubismTimestamps: number[],
  context: any,
  step: number
): cubism.Metric[] {
  return series.map((serie, serieIndex) => convertDataToCubism(serie, serieIndex, cubismTimestamps, context));
}
