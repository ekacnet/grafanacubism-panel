import {
  convertDataToCubism,
  convertAllDataToCubism,
  upSampleData,
  downSampleData,
  sumValues,
  averageValues,
  maxValue,
  minValue,
} from '../cubism_utils';
import _ from 'lodash';
import { toDataFrame } from '@grafana/data';

describe('convertDataToCubism', () => {
  it('should be defined', () => {
    expect(convertDataToCubism).toBeDefined();
  });

  it('should be callable with valid arguments', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 2],
      ],
    };
    let series = toDataFrame(input1);
    const seriesIndex = 0;
    const timestamps = [1, 2, 3];
    const context = {
      metric: (callback: any, name: string) => {},
    };

    expect(() => convertDataToCubism(series, seriesIndex, timestamps, context, true)).not.toThrow();
  });
  it('should return null if no serie', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [],
    };
    let series = toDataFrame(input1);
    const seriesIndex = 0;
    const timestamps = [1, 2, 4, 6, 7, 10];
    let values;
    const context = {
      metric: (callback: any, name: string) => {
        callback(1, 20, 1, (a: any, b: any) => {
          values = b;
        });
      },
    };

    let v = convertDataToCubism(series, seriesIndex, timestamps, context, false);
    expect(values).toBe(undefined);
    expect(v).toBe(null);
  });
  it('should extend the data points when upsampling', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 4],
        [1000, 10],
      ],
    };
    let series = toDataFrame(input1);
    const seriesIndex = 0;
    const timestamps = [1, 2, 4, 6, 7, 10];
    let values;
    const context = {
      metric: (callback: any, name: string) => {
        callback(1, 20, 1, (a: any, b: any) => {
          values = b;
        });
      },
    };

    convertDataToCubism(series, seriesIndex, timestamps, context, false);
    expect(values).toStrictEqual([100, 100, 200, 200, 200, 1000]);
  });
  it('should not extend the data points when downsampling', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 4],
        [1000, 10],
      ],
    };
    let series = toDataFrame(input1);
    const seriesIndex = 0;
    const timestamps = [1, 2, 4, 6, 7, 10];
    let values;
    const context = {
      metric: (callback: any, name: string) => {
        callback(1, 20, 1, (a: any, b: any) => {
          values = b;
        });
      },
    };

    convertDataToCubism(series, seriesIndex, timestamps, context, true);
    expect(values).toStrictEqual([100, 100, 200, 200, null, 1000]);
  });

  it('should return the same number of data points', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 4],
        [1000, 10],
      ],
    };
    let series = toDataFrame(input1);
    const seriesIndex = 0;
    const timestamps = [1, 4, 10];
    let values;
    const context = {
      metric: (callback: any, name: string) => {
        callback(1, 20, 1, (a: any, b: any) => {
          values = b;
        });
      },
    };

    convertDataToCubism(series, seriesIndex, timestamps, context, true);
    expect(values).toStrictEqual([100, 200, 1000]);

    convertDataToCubism(series, seriesIndex, timestamps, context, false);
    expect(values).toStrictEqual([100, 200, 1000]);
  });
  it('should return less data points', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 2],
        [400, 4],
        [600, 6],
        [800, 8],
        [1000, 10],
      ],
    };
    let series = toDataFrame(input1);
    const seriesIndex = 0;
    const timestamps = [1, 3, 5, 10];
    let values;
    const context = {
      metric: (callback: any, name: string) => {
        callback(1, 20, 1, (a: any, b: any) => {
          values = b;
        });
      },
    };

    convertDataToCubism(series, seriesIndex, timestamps, context, true);
    expect(values).toStrictEqual([150, 400, 700, 1000]);
  });
});

describe('upSampleData', () => {
  it('should return a function', () => {
    const result = upSampleData([1, 2, 3], [1000, 2000, 3000]);
    expect(typeof result).toBe('function');
  });

  it('should return the correct point when ts is less than nextPointTS', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [1000, 2000, 3000];
    const pointIndex = 0;
    const fn = upSampleData(dataPoints, dataPointsTS);
    const result = fn(1500, 0);
    expect(result).toBe(dataPoints[pointIndex]);
  });

  it('should return the next point when ts is greater than or equal to nextPointTS', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [1000, 2000, 3000];
    const pointIndex = 0;
    const fn = upSampleData(dataPoints, dataPointsTS);
    const result = fn(2000, 0);
    expect(result).toBe(dataPoints[pointIndex + 1]);
  });

  it('should return the last point when there is no next point', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [1000, 2000, 3000];
    const fn = upSampleData(dataPoints, dataPointsTS);
    fn(2000, 1);
    fn(3000, 2);
    let result = fn(4000, 3);
    expect(result).toBe(3);
  });

  it('should return a 4 elements array with the right values when called in map()', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [1000, 2000, 4000];
    const timestamps = [1000, 2000, 3000, 4000];
    let values = _.chain(timestamps).map(upSampleData(dataPoints, dataPointsTS)).value();
    expect(values.length).toBe(4);
    expect(values).toStrictEqual([1, 2, 2, 3]);
  });
  it('should set values to 0 before and after', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [100, 110, 120];
    const timestamps = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
    let values = _.chain(timestamps).map(upSampleData(dataPoints, dataPointsTS)).value();
    expect(values.length).toBe(timestamps.length);
    expect(values).toStrictEqual([1, 1, 1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });
});

describe('testAverageValue', () => {
  it('should return the avgerage value of a 1 element array', () => {
    const values = [1];
    const result = averageValues(values);
    expect(result).toBe(1);
  });
  it('should return the avgerage value of a 2 element array', () => {
    const values = [3, 1];
    const result = averageValues(values);
    expect(result).toBe(2);
  });
  it('should return the avgerage value of a 3 element array', () => {
    const values = [5, 2, 2];
    const result = averageValues(values);
    expect(result).toBe(3);
  });
  it('should return the avgerage value of a 0 element array', () => {
    const values: number[] = [];
    expect(() => averageValues(values)).toThrow('Reduce of empty array with no initial value');
  });
});

describe('testMaxValue', () => {
  it('should return the maximum value of a 1 element array', () => {
    const values = [1];
    const result = maxValue(values);
    expect(result).toBe(1);
  });
  it('should return the maximum value of a 2 element array', () => {
    const values = [3, 1];
    const result = maxValue(values);
    expect(result).toBe(3);
  });
  it('should return the maximum value of a 3 element array', () => {
    const values = [3, 2, 2];
    const result = maxValue(values);
    expect(result).toBe(3);
  });
  it('should return the maximum value of a 0 element array', () => {
    const values: number[] = [];
    expect(() => maxValue(values)).toThrow('Reduce of empty array with no initial value');
  });
});

describe('testMinValue', () => {
  it('should return the minimum value of a 1 element array', () => {
    const values = [1];
    const result = minValue(values);
    expect(result).toBe(1);
  });
  it('should return the minimum value of a 2 element array', () => {
    const values = [3, 1];
    const result = minValue(values);
    expect(result).toBe(1);
  });
  it('should return the minimum value of a 3 element array', () => {
    const values = [3, 2, 2];
    const result = minValue(values);
    expect(result).toBe(2);
  });
  it('should return the minimum value of a 0 element array', () => {
    const values: number[] = [];
    expect(() => minValue(values)).toThrow('Reduce of empty array with no initial value');
  });
});

describe('testsumValue', () => {
  it('should return the sumimum value of a 1 element array', () => {
    const values = [1];
    const result = sumValues(values);
    expect(result).toBe(1);
  });
  it('should return the sumimum value of a 2 element array', () => {
    const values = [3, 1];
    const result = sumValues(values);
    expect(result).toBe(4);
  });
  it('should return the sumimum value of a 3 element array', () => {
    const values = [3, 2, 2];
    const result = sumValues(values);
    expect(result).toBe(7);
  });
  it('should return the sumimum value of a 0 element array', () => {
    const values: number[] = [];
    expect(() => sumValues(values)).toThrow('Reduce of empty array with no initial value');
  });
});

describe('downSampleData', () => {
  it('should return sum of values when summaryType is sum', () => {
    const timestamps = [1, 2, 4];
    const dataAndTS = [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
    ];
    const override = { summaryType: 'sum' };

    const result = downSampleData(timestamps, dataAndTS, override);

    expect(result(1, 0)).toEqual(10);
    expect(result(2, 1)).toEqual(50);
    expect(result(4, 2)).toEqual(40);
  });

  it('should return min value when summaryType is min', () => {
    const timestamps = [1, 2, 4];
    const dataAndTS = [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
    ];
    const override = { summaryType: 'min' };

    const result = downSampleData(timestamps, dataAndTS, override);

    expect(result(1, 0)).toEqual(10);
    expect(result(2, 1)).toEqual(20);
    expect(result(4, 2)).toEqual(40);
  });
  it('should return max value when summaryType is max', () => {
    const timestamps = [1, 2, 4];
    const dataAndTS = [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
    ];
    const override = { summaryType: 'max' };

    const result = downSampleData(timestamps, dataAndTS, override);

    expect(result(1, 0)).toEqual(10);
    expect(result(2, 1)).toEqual(30);
    expect(result(4, 2)).toEqual(40);
  });

  it('should return average value when summaryType is not defined', () => {
    const timestamps = [1, 2, 4];
    const dataAndTS = [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
    ];
    const override = { summaryType: 'avg' };

    const result = downSampleData(timestamps, dataAndTS, override);

    expect(result(1, 0)).toEqual(10);
    expect(result(2, 1)).toEqual(25);
    expect(result(4, 3)).toEqual(40);
  });

  it('should return a 4 elements array with the right values when called in map()', () => {
    const timestamps = [1, 2, 4];
    const dataAndTS = [
      [1, 10],
      [2, 20],
      [3, 30],
      [4, 40],
    ];
    const override = { summaryType: 'avg' };

    let values = _.chain(timestamps).map(downSampleData(timestamps, dataAndTS, override)).value();
    expect(values.length).toBe(3);
    expect(values).toStrictEqual([10, 25, 40]);
  });
  it('should return the correct point when ts is less than nextPointTS', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [1000, 2000, 3000];
    let val: number[][] = [];
    const override = { summaryType: 'sum' };

    for (let i = 0; i < dataPoints.length; i++) {
      val.push([dataPointsTS[i], dataPoints[i]]);
    }

    let fn = downSampleData(dataPointsTS, val, override);
    const result = fn(1000, 0);
    expect(result).toBe(dataPoints[0]);
  });

  it('should return the next point when ts is greater than or equal to nextPointTS', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [1000, 2000, 3000];
    let val: number[][] = [];
    const override = { summaryType: 'sum' };

    for (let i = 0; i < dataPoints.length; i++) {
      val.push([dataPointsTS[i], dataPoints[i]]);
    }

    let fn = downSampleData(dataPointsTS, val, override);
    const result = fn(2000, 1);
    expect(result).toBe(dataPoints[1]);
  });

  it('should return the last point when there is no next point', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [1000, 2000, 3000];
    let val: number[][] = [];
    const override = { summaryType: 'sum' };

    for (let i = 0; i < dataPoints.length; i++) {
      val.push([dataPointsTS[i], dataPoints[i]]);
    }

    let fn = downSampleData([1000, 2000, 3000, 4000], val, override);
    const result = fn(4000, 3);
    expect(result).toBe(null);
  });

  it('should return a 5 elements array with the right values when called in map()', () => {
    const dataPoints = [1, 2, 3, 4];
    const dataPointsTS = [1000, 2000, 5000];
    const timestamps = [1000, 2000, 3000, 4000, 5000];
    let val: number[][] = [];
    const override = { summaryType: 'sum' };

    for (let i = 0; i < dataPoints.length; i++) {
      val.push([dataPointsTS[i], dataPoints[i]]);
    }

    let values = _.chain(timestamps).map(downSampleData(timestamps, val, override)).value();
    expect(values.length).toBe(5);
    expect(values).toStrictEqual([1, 2, 2, null, 3]);
  });
  it('should set values to null before and after', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [100, 110, 120];
    const timestamps = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
    let val: number[][] = [];
    const override = { summaryType: 'sum' };

    for (let i = 0; i < dataPoints.length; i++) {
      val.push([dataPointsTS[i], dataPoints[i]]);
    }

    let values = _.chain(timestamps).map(downSampleData(timestamps, val, override)).value();
    expect(values.length).toBe(timestamps.length);
    expect(values).toStrictEqual([null, null, null, 1, 2, 3, 3, null, null, null, null, null, null, null]);
  });
  it('should not extend the last value after the end', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [100, 110, 120];
    const timestamps = [70, 80, 90, 100, 110, 120, 130];
    let val: number[][] = [];
    const override = { summaryType: 'sum' };

    for (let i = 0; i < dataPoints.length; i++) {
      val.push([dataPointsTS[i], dataPoints[i]]);
    }

    let values = _.chain(timestamps).map(downSampleData(timestamps, val, override)).value();
    expect(values.length).toBe(timestamps.length);
    expect(values).toStrictEqual([null, null, null, 1, 2, 3, null]);
  });
  it('should set values to 0 before and after add missing a bit even when not aligned', () => {
    const dataPoints = [1, 2, 3];
    const dataPointsTS = [101, 111, 131];
    const timestamps = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
    let val: number[][] = [];
    const override = { summaryType: 'sum' };

    for (let i = 0; i < dataPoints.length; i++) {
      val.push([dataPointsTS[i], dataPoints[i]]);
    }

    let values = _.chain(timestamps).map(downSampleData(timestamps, val, override)).value();
    expect(values.length).toBe(timestamps.length);
    expect(values).toStrictEqual([null, null, null, 1, 2, 2, 3, 3, null, null, null, null, null, null]);
  });
  it('should not extend when the gap is too big', () => {
    const dataPoints = [1, 2, 3, 4];
    const dataPointsTS = [101, 111, 172, 179];
    const timestamps = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
    let val: number[][] = [];
    const override = { summaryType: 'avgerage' };

    for (let i = 0; i < dataPoints.length; i++) {
      val.push([dataPointsTS[i], dataPoints[i]]);
    }

    let values = _.chain(timestamps).map(downSampleData(timestamps, val, override)).value();
    expect(values.length).toBe(timestamps.length);
    expect(values).toStrictEqual([null, null, null, 1, 2, 2, null, null, null, null, 3.5, 3.5, null, null]);
  });
  it('should convertAllDataToCubism just work', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 2],
        [300, 3],
      ],
    };
    const input2 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 2],
        [300, 3],
        [300, 4],
      ],
    };
    let series = [toDataFrame(input1), toDataFrame(input2)];
    const timestamps = [1, 2, 3, 4];
    const context = {
      metric: (callback: any, name: string) => {},
    };

    expect(() => convertAllDataToCubism(series, timestamps, context, 1)).not.toThrow();
  });
  it('should convertAllDataToCubism just work even without a Time field', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 2],
        [300, 3],
      ],
    };
    let serie = toDataFrame(input1);
    serie.fields[0].name = 'foo';
    let series = [serie];
    const timestamps = [1, 2, 3, 4];
    let values;
    const context = {
      metric: (callback: any, name: string) => {
        callback(1, 20, 1, (a: any, b: any) => {
          values = b;
        });
      },
    };

    expect(() => convertAllDataToCubism(series, timestamps, context, 1)).not.toThrow();
    expect(values).toStrictEqual([100, 200, 300, 300]);
  });
  it('should convertAllDataToCubism not add points if there is too much blanks', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [100, 2],
        [200, 5],
        [300, 10],
      ],
    };
    let serie = toDataFrame(input1);
    serie.fields[0].name = 'foo';
    let series = [serie];
    const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let values;
    const context = {
      metric: (callback: any, name: string) => {
        callback(1, 20, 1, (a: any, b: any) => {
          values = b;
        });
      },
    };

    expect(() => convertAllDataToCubism(series, timestamps, context, 1)).not.toThrow();
    expect(values).toStrictEqual([100, 100, 100, null, 200, 200, null, null, null, 300]);
  });

  it('should convertAllDataToCubism with a larger timeserie', () => {
    const input1 = {
      target: 'Field Name',
      datapoints: [
        [100, 1],
        [200, 2],
        [300, 3],
        [400, 4],
        [500, 5],
      ],
    };
    let serie = toDataFrame(input1);
    let series = [serie];
    const timestamps = [1, 3, 5];
    let values;
    const context = {
      metric: (callback: any, name: string) => {
        callback(1, 20, 1, (a: any, b: any) => {
          values = b;
        });
      },
    };

    expect(() => convertAllDataToCubism(series, timestamps, context, 1)).not.toThrow();
    expect(values).toStrictEqual([150, 350, 500]);
  });
});
