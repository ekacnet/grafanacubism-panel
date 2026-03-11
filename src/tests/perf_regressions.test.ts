// Regression tests for the performance/cleanup fixes.
//
// These lock in the contracts that make the perf wins correct:
// - genGrafanaMetric's cursor is stateful (O(n) scan) but resets on each
//   factory call, so repeated cubism polls each start fresh
// - convertDataToCubism hoists the dataAndTS zip, so the metric callback
//   can be invoked repeatedly without re-zipping
// - getSerieByName's early-exit rewrite still correctly rejects 3+ duplicates

import { genGrafanaMetric, convertDataToCubism, getSerieByName } from '../cubism_utils';
import { toDataFrame } from '@grafana/data';

describe('genGrafanaMetric — stateful cursor', () => {
  // The cursor is hoisted outside the returned closure so .map() scans
  // the data once (O(n)) instead of restarting from 0 on every timestamp.
  // These tests verify the stateful behavior is correct and doesn't leak
  // across separate factory calls.

  const dataAndTS = [
    [100, 10],
    [200, 20],
    [300, 30],
    [400, 40],
    [500, 50],
  ];

  it('returns identical results across two separate factory calls (fresh cursor each time)', () => {
    // Each genGrafanaMetric() call is a fresh closure with its own cursor.
    // This is what happens inside context.metric() on every cubism poll.
    const timestamps = [100, 250, 400, 500];
    const override = { summaryType: 'avg' };

    const result1 = timestamps.map(genGrafanaMetric(timestamps, dataAndTS, override, 100));
    const result2 = timestamps.map(genGrafanaMetric(timestamps, dataAndTS, override, 100));

    expect(result1).toStrictEqual(result2);
    expect(result1).toStrictEqual([15, 30, 40, 50]);
  });

  it('produces consistent results over many re-polls (simulating live cubism)', () => {
    // Cubism calls the metric callback repeatedly. The cursor must reset
    // every poll or subsequent polls would start mid-scan and return wrong data.
    const timestamps = [100, 200, 300, 400, 500];
    const override = { summaryType: 'sum' };

    const expected = [10, 20, 30, 40, 50];
    for (let poll = 0; poll < 5; poll++) {
      const fn = genGrafanaMetric(timestamps, dataAndTS, override, 100);
      const result = timestamps.map(fn);
      expect(result).toStrictEqual(expected);
    }
  });

  it('cursor advances monotonically within a single map() pass (no backtracking)', () => {
    // This is the contract that makes O(n) possible. We can't observe
    // the cursor directly, but we can verify the result matches a
    // brute-force O(n²) reference implementation on a larger dataset.
    const bigData: number[][] = [];
    for (let i = 0; i < 1000; i++) {
      bigData.push([i * 10, i]);
    }
    const timestamps: number[] = [];
    for (let i = 0; i < 100; i++) {
      timestamps.push(i * 100);
    }
    const override = { summaryType: 'avg' };

    const fast = timestamps.map(genGrafanaMetric(timestamps, bigData, override, 10));

    // Brute-force reference: for each timestamp bucket, average all data
    // points that fall in [ts, nextTs).
    const reference = timestamps.map((ts, idx) => {
      const nextTs = idx + 1 < timestamps.length ? timestamps[idx + 1] : Infinity;
      const bucket = bigData
        .filter(([dts]) => dts >= ts && dts < nextTs)
        .map(([, v]) => v);
      if (bucket.length === 0) {
        return null;
      }
      return bucket.reduce((a, b) => a + b, 0) / bucket.length;
    });

    // The last bucket's handling differs slightly (the cubism version
    // uses `<= lastTs` semantics for the final timestamp, the reference
    // uses [ts, Infinity)). Compare all but last, then spot-check last.
    expect(fast.slice(0, -1)).toStrictEqual(reference.slice(0, -1));
    expect(fast[fast.length - 1]).not.toBeNull();
  });
});

describe('convertDataToCubism — hoisted dataAndTS', () => {
  // The dataAndTS zip is now built once at registration time, not on
  // every cubism poll. These tests verify the metric callback can be
  // invoked repeatedly and still returns correct values.

  it('returns consistent values when the metric callback is invoked multiple times', () => {
    const input = {
      target: 'test',
      datapoints: [
        [10, 100],
        [20, 200],
        [30, 300],
      ],
    };
    const series = toDataFrame(input);
    series.fields[0].config.interval = 100;
    const timestamps = [100, 200, 300];

    let callCount = 0;
    const results: any[] = [];
    const context = {
      metric: (callback: any, name: string) => {
        // Simulate cubism polling 3 times from the same registration.
        for (let i = 0; i < 3; i++) {
          callback(0, 0, 0, (err: any, values: any) => {
            callCount++;
            results.push(values);
          });
        }
      },
    };

    convertDataToCubism(series, 0, timestamps, context);

    expect(callCount).toBe(3);
    // All three polls should produce identical values — the hoisted
    // dataAndTS array persists across callback invocations.
    expect(results[0]).toStrictEqual([10, 20, 30]);
    expect(results[1]).toStrictEqual(results[0]);
    expect(results[2]).toStrictEqual(results[0]);
  });

  it('does not mutate the source DataFrame between polls', () => {
    // Hoisting is safe only if the zipped array doesn't capture live
    // references that could be mutated. DataFrame field values are
    // arrays; verify they aren't aliased or spliced.
    const input = {
      target: 'test',
      datapoints: [
        [10, 100],
        [20, 200],
      ],
    };
    const series = toDataFrame(input);
    series.fields[0].config.interval = 100;
    const originalValues = [...series.fields[1].values];
    const timestamps = [100, 200];

    const context = {
      metric: (callback: any) => {
        callback(0, 0, 0, () => {});
        callback(0, 0, 0, () => {});
      },
    };

    convertDataToCubism(series, 0, timestamps, context);

    // Source values unchanged after multiple polls.
    expect([...series.fields[1].values]).toStrictEqual(originalValues);
  });
});

describe('getSerieByName — early-exit duplicate detection', () => {
  // The rewrite uses a for-loop with early return on the second match.
  // Verify it still correctly returns null when 3+ fields share a name
  // (the early exit makes it not need to see the 3rd, but the contract
  // is still "any duplicate → null").

  it('returns null when three series share the same display name', () => {
    const series = [
      toDataFrame({ target: 'Dup', datapoints: [[1, 1], [2, 2]] }),
      toDataFrame({ target: 'Dup', datapoints: [[3, 3], [4, 4]] }),
      toDataFrame({ target: 'Dup', datapoints: [[5, 5], [6, 6]] }),
    ];
    expect(getSerieByName(series, 'Dup')).toBeNull();
  });

  it('returns the field when the only match is the last series', () => {
    // Confirms we don't early-exit before scanning all series.
    const series = [
      toDataFrame({ target: 'First', datapoints: [[1, 1], [2, 2]] }),
      toDataFrame({ target: 'Second', datapoints: [[3, 3], [4, 4]] }),
      toDataFrame({ target: 'Target', datapoints: [[5, 5], [6, 6]] }),
    ];
    const result = getSerieByName(series, 'Target');
    expect(result).not.toBeNull();
    expect(result?.state?.displayName).toBe('Target');
  });

  it('returns null when matches are in the first and last series (non-adjacent)', () => {
    const series = [
      toDataFrame({ target: 'Dup', datapoints: [[1, 1], [2, 2]] }),
      toDataFrame({ target: 'Middle', datapoints: [[3, 3], [4, 4]] }),
      toDataFrame({ target: 'Dup', datapoints: [[5, 5], [6, 6]] }),
    ];
    expect(getSerieByName(series, 'Dup')).toBeNull();
  });
});
