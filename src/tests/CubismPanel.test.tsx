// Regression tests for the React render-perf fixes:
// - cubism.context() held in useRef — created once per mount, not per render
// - styles getter memoized — useStyles2 receives a stable reference
//
// Before the fix, every React re-render created a fresh cubism context,
// which both allocated new cubism internals AND changed the useEffect
// dependency, causing the render-throttle to re-fire constantly.

import React from 'react';
import { render } from '@testing-library/react';
import { dateTime, LoadingState, PanelData, EventBusSrv } from '@grafana/data';

// Wrap cubism.context() in a jest.fn() so we can count calls.
// ESM exports are non-configurable so jest.spyOn fails; use jest.mock instead.
jest.mock('cubism-ng', () => {
  const actual = jest.requireActual('cubism-ng');
  return {
    ...actual,
    context: jest.fn(actual.context),
  };
});
import * as cubism from 'cubism-ng';
const contextSpy = cubism.context as jest.Mock;

import { D3Graph } from '../components/CubismPanel';
import { CubismOptions } from '../types';

const makeOptions = (text = ''): CubismOptions => ({
  text,
  extentMin: -10,
  extentMax: 10,
  automaticExtents: true,
  links: [],
});

const makeEmptyData = (): PanelData => {
  const from = dateTime(1700000000000);
  const to = dateTime(1700003600000);
  return {
    series: [], // empty — D3GraphRender early-returns with "no data" message
    state: LoadingState.Done,
    timeRange: { from, to, raw: { from: 'now-1h', to: 'now' } },
    request: {
      app: 'dashboard',
      requestId: 'Q1',
      timezone: 'browser',
      panelId: 1,
      range: { from, to, raw: { from: 'now-1h', to: 'now' } },
      targets: [{ refId: 'A' }],
      scopedVars: {},
      interval: '60s',
      intervalMs: 60000,
      maxDataPoints: 100,
      startTime: 0,
    },
  };
};

describe('D3Graph — cubism.context() stability', () => {
  beforeEach(() => {
    contextSpy.mockClear();
  });

  it('calls cubism.context() exactly once across multiple re-renders', () => {
    const eventBus = new EventBusSrv();
    const data = makeEmptyData();

    const { rerender } = render(
      <D3Graph
        height={100}
        width={200}
        data={data}
        options={makeOptions()}
        eventBus={eventBus}
      />
    );

    const callsAfterMount = contextSpy.mock.calls.length;
    expect(callsAfterMount).toBe(1);

    // Re-render several times with changed props (but same options shape).
    // The context should NOT be recreated.
    for (let i = 0; i < 5; i++) {
      rerender(
        <D3Graph
          height={100 + i}
          width={200 + i}
          data={data}
          options={makeOptions()}
          eventBus={eventBus}
        />
      );
    }

    expect(contextSpy.mock.calls.length).toBe(callsAfterMount);
  });

  it('creates a fresh context when the component remounts', () => {
    const eventBus = new EventBusSrv();
    const data = makeEmptyData();

    const { unmount } = render(
      <D3Graph
        height={100}
        width={200}
        data={data}
        options={makeOptions()}
        eventBus={eventBus}
      />
    );
    expect(contextSpy.mock.calls.length).toBe(1);

    unmount();

    // Mount a fresh instance — should get a new context.
    render(
      <D3Graph
        height={100}
        width={200}
        data={data}
        options={makeOptions()}
        eventBus={eventBus}
      />
    );
    expect(contextSpy.mock.calls.length).toBe(2);
  });

  it('does not recreate context when options.text toggles showText', () => {
    // Toggling showText changes the memoized styles getter (expected),
    // but must NOT recreate the cubism context.
    const eventBus = new EventBusSrv();
    const data = makeEmptyData();

    const { rerender } = render(
      <D3Graph
        height={100}
        width={200}
        data={data}
        options={makeOptions('')}
        eventBus={eventBus}
      />
    );
    expect(contextSpy.mock.calls.length).toBe(1);

    rerender(
      <D3Graph
        height={100}
        width={200}
        data={data}
        options={makeOptions('hello')}
        eventBus={eventBus}
      />
    );
    expect(contextSpy.mock.calls.length).toBe(1);

    rerender(
      <D3Graph
        height={100}
        width={200}
        data={data}
        options={makeOptions('')}
        eventBus={eventBus}
      />
    );
    expect(contextSpy.mock.calls.length).toBe(1);
  });
});
