import _ from 'lodash';
import { DataFrame } from '@grafana/data';

export function upSampleData(dataPoints: number[], dataPointsTS: number[], pointIndex: number) {
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

    if (override.summaryType === 'sum') {
      return sumValues(values);
    } else if (override.summaryType === 'min') {
      return minValue(values);
    } else if (override.summaryType === 'max') {
      return maxValue(values);
    } else {
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

export function convertDataToCubism(series: DataFrame, seriesIndex: number, timestamps: number[], context: any) {
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
      values = _.chain(timestamps).map(upSampleData(dataPoints, dataPointsTS, pointIndex)).value();
    } else {
      let override = { summaryType: 'avg' };
      let dataAndTS = dataPointsTS.map((item, index) => [item, dataPoints[index]]);
      values = _.chain(timestamps).map(downSampleData(timestamps, dataAndTS, override)).value();
    }
    callback(null, values);
  }, series.fields[1].name);
}
