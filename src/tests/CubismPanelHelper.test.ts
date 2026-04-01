import { D3GraphRender, zoomCallbackGen } from '../components/CubismPanelHelper';
import { CubismOptions } from '../types';
import { convertAllDataToCubism } from '../cubism_utils';
import * as d3 from 'd3';
import * as cubism from 'cubism-ng';

import { DashboardLink, DashboardLinkType } from '@grafana/schema';
import { dateTime, toDataFrame, LoadingState, PanelData } from '@grafana/data';
import { enableDebug } from 'misc_utils';

const getValidSerie = (width: number, seed: number, span: number) => {
  const timestamp = 1598919367000;
  const timestamp2 = 1598919367000 + span * 1000;
  let step = (span * 1000) / width;
  let value = 0,
    i = 0;
  let datapoints = [];
  for (let v = timestamp; v <= timestamp2; v += step) {
    datapoints.push([
      (value = Math.max(-10, Math.min(10, value + 0.8 * Math.random() - 0.4 + 0.2 * Math.cos((i += seed * 0.02))))),
      v,
    ]);
  }
  const input1 = {
    target: 'Field Name',
    datapoints: datapoints,
  };
  let series = toDataFrame(input1);

  return series;
};

const getData = (span: number): PanelData => {
  const input1 = {
    target: 'Field Name',
    datapoints: [
      [100, 1],
      [200, 4],
      [1000, 10],
    ],
  };
  const timestamp = 1598919367000;
  const timestamp2 = timestamp + span * 1000;
  const from = dateTime(timestamp);
  const to = dateTime(timestamp2);
  let series = toDataFrame(input1);
  series.fields[1].labels = { instance: 'grafana' };
  let data: PanelData = {
    request: {
      startTime: 12,
      intervalMs: 10,
      app: 'dashboard', // Example field
      requestId: 'Q101', // Example field
      timezone: 'browser', // Example field
      panelId: 1, // Example field
      range: {
        from: from,
        to: to,
        raw: {
          from: 'now-1h', // Example field
          to: 'now', // Example field
        },
      },
      targets: [
        {
          refId: 'A',
        },
      ],
      scopedVars: {}, // Example field
      maxDataPoints: 500, // Example field
      interval: '60s', // Example field
    },
    series: [series],
    state: LoadingState.Done,
    timeRange: {
      from: from,
      to: to,
      raw: {
        from: 'now-1m',
        to: 'now',
      },
    },
  };
  return data;
};

const createMockOptions = (url?: string): CubismOptions => {
  const type: DashboardLinkType = 'link';
  let dashLink: DashboardLink[] = [];
  if (url !== undefined) {
    dashLink.push({
      asDropdown: false,
      icon: '',
      includeVars: false,
      keepTime: false,
      tags: [],
      targetBlank: true,
      title: 'title',
      tooltip: 'tooltip',
      url: url,
      type: type,
    });
  }
  return {
    links: dashLink,
    text: 'foo',
    extentMin: 0,
    extentMax: 10,
    automaticExtents: true,
    zoomBehavior: 'datalink' as const,
  };
};

describe('D3GraphRender', () => {
  const width = 300;
  let mockContext: any; // mock the cubism Context
  let mockData: any;
  let mockOptions: any;
  let mockStyles: any;
  let mockPanelDiv: HTMLDivElement;
  let mockTicks: any;
  let mockExtent: any;
  let mockColors: any;
  let mockEventBus: any;
  const oldConsole = console.log;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(() => {}),
    };
    mockTicks = jest.fn(() => {
      return mockContext.axis();
    });
    mockExtent = jest.fn(() => {
      return mockContext.horizon();
    });
    mockColors = jest.fn(() => {
      return mockContext.horizon();
    });
    mockContext = {
      size: jest.fn().mockReturnThis(),
      step: jest.fn().mockReturnThis(),
      serverDelay: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      // @ts-ignore
      metric: function (f, n) {
        return this._fake.metric(f, n);
      },
      setCSSClass: jest.fn().mockReturnThis(),
      axis: jest.fn(() => ({
        ticks: mockTicks,
        orient: jest.fn().mockReturnThis(),
        render: jest.fn(),
      })),
      horizon: jest.fn(() => ({
        render: jest.fn(),
        extent: mockExtent,
        colors: mockColors,
      })),
      rule: jest.fn(() => ({ render: jest.fn() })),
      zoom: jest.fn(() => ({
        render: jest.fn(),
        setZoomType: jest.fn().mockReturnThis(),
      })),
      on: jest.fn(),
      _fake: cubism.context(),
    };

    mockData = {
      series: [
        /* mock series data here */
      ],
      request: { range: { from: 123, to: 456 }, timezone: 'UTC' },
    };
    mockOptions = {
      text: 'Hello, World!',
      automaticExtents: false,
      extentMin: 0,
      extentMax: 100,
      automaticSampling: true,
      sampleType: false,
    };
    mockStyles = {
      'cubism-panel': 'panel',
      cubismgraph: 'graph',
      canvas: 'canvas',
      axis: 'axis',
      horizon: 'horizon',
      rule: 'rule',
      value: 'value',
      title: 'title',
      textBox: 'text-box',
    };

    mockPanelDiv = document.createElement('div');
    Object.defineProperty(mockPanelDiv, 'clientWidth', {
      value: width,
      writable: false, // Ensuring the property remains read-only
    });

    // Mock console functions for testing
  });

  afterEach(() => {
    console.log = oldConsole;
    jest.clearAllMocks();
  });
  it('should not render if panelDiv is null or data.series is empty', () => {
    const renderFn = D3GraphRender(
      mockContext,
      getData(86400),
      mockOptions,
      mockStyles,
      mockEventBus,
      jest.fn(),
      convertAllDataToCubism
    );
    expect(renderFn(null)).toBeUndefined();
  });

  it('should not render graph when data series is empty ', () => {
    const renderFn = D3GraphRender(
      mockContext,
      mockData,
      mockOptions,
      mockStyles,
      mockEventBus,
      jest.fn(),
      convertAllDataToCubism
    );
    expect(renderFn(mockPanelDiv)).toBeUndefined();
  });
  it('should call convertDataToCubism with Auto', () => {
    let data = getData(86400);
    data.series[0].length = 0;
    const mockHelper = jest.fn(() => [null]);
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), mockHelper);
    renderFn(mockPanelDiv);

    const calls = mockHelper.mock.calls as unknown[][];

    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe(data.series);
    expect(calls[0][2]).toStrictEqual(mockContext);
    expect(calls[0][3]).toStrictEqual(288000);
    expect(mockPanelDiv.innerHTML).toBe('The series contained no data, check your query');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).not.toHaveBeenCalled();
    expect(mockContext.horizon).not.toHaveBeenCalled();
    expect(mockContext.rule).not.toHaveBeenCalled();
    expect(mockContext.zoom).not.toHaveBeenCalled();
  });
  it('should call convertDataToCubism with Auto', () => {
    let data = getData(86400);
    data.series[0].length = 0;
    const mockHelper = jest.fn(() => []);
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), mockHelper);
    renderFn(mockPanelDiv);

    const calls = mockHelper.mock.calls as unknown[][];

    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe(data.series);
    expect(calls[0][2]).toStrictEqual(mockContext);
    expect(calls[0][3]).toStrictEqual(288000);
    expect(mockPanelDiv.innerHTML).toBe('The series contained no data, check your query');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).not.toHaveBeenCalled();
    expect(mockContext.horizon).not.toHaveBeenCalled();
    expect(mockContext.rule).not.toHaveBeenCalled();
    expect(mockContext.zoom).not.toHaveBeenCalled();
  });
  it('should call convertDataToCubism with Upsample', () => {
    let data = getData(86400);
    data.series[0].length = 0;
    const mockHelper = jest.fn(() => []);
    mockOptions.automaticSampling = false;
    mockOptions.sampleType = false;
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), mockHelper);
    renderFn(mockPanelDiv);

    const calls = mockHelper.mock.calls as unknown[][];

    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe(data.series);
    expect(calls[0][2]).toStrictEqual(mockContext);
    expect(calls[0][3]).toStrictEqual(288000);
    expect(mockPanelDiv.innerHTML).toBe('The series contained no data, check your query');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).not.toHaveBeenCalled();
    expect(mockContext.horizon).not.toHaveBeenCalled();
    expect(mockContext.rule).not.toHaveBeenCalled();
    expect(mockContext.zoom).not.toHaveBeenCalled();
  });
  it('should call convertDataToCubism with Downsample', () => {
    let data = getData(86400);
    data.series[0].length = 0;
    const mockHelper = jest.fn(() => []);
    mockOptions.automaticSampling = false;
    mockOptions.sampleType = true;
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), mockHelper);
    renderFn(mockPanelDiv);

    const calls = mockHelper.mock.calls as unknown[][];

    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe(data.series);
    expect(calls[0][2]).toStrictEqual(mockContext);
    expect(calls[0][3]).toStrictEqual(288000);
    expect(mockPanelDiv.innerHTML).toBe('The series contained no data, check your query');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).not.toHaveBeenCalled();
    expect(mockContext.horizon).not.toHaveBeenCalled();
    expect(mockContext.rule).not.toHaveBeenCalled();
    expect(mockContext.zoom).not.toHaveBeenCalled();
  });
  it('should not render if there is not real data', () => {
    const data = getData(86400);
    data.series = [getValidSerie(width, 1, 86400)];
    mockOptions.automaticSampling = false;
    mockOptions.sampleType = false;
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    // Create a spy on the function

    renderFn(mockPanelDiv);

    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalledWith(d3.timeHour, 6);
    expect(mockContext.horizon).toHaveBeenCalled();
    expect(mockContext.rule).toHaveBeenCalled();
    expect(mockContext.zoom).toHaveBeenCalled();
  });
  it('should render graph and text when panelDiv and data are valid no extent', () => {
    const data = getData(86400);
    data.series = [getValidSerie(width, 1, 86400)];
    mockOptions.automaticExtents = true;
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    renderFn(mockPanelDiv);

    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalled();
    expect(mockExtent).not.toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalledWith(d3.timeHour, 6);
    expect(mockContext.horizon).toHaveBeenCalled();
    expect(mockContext.rule).toHaveBeenCalled();
    expect(mockContext.zoom).toHaveBeenCalled();
  });
  it('should render graph and text when panelDiv and data are valid', () => {
    const data = getData(86400);
    data.series = [getValidSerie(width, 1, 86400)];
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    renderFn(mockPanelDiv);

    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).toHaveBeenCalled();
    expect(mockExtent).toHaveBeenCalledWith([mockOptions.extentMin, mockOptions.extentMax]);
    expect(mockTicks).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalledWith(d3.timeHour, 6);
    expect(mockContext.horizon).toHaveBeenCalled();
    expect(mockContext.rule).toHaveBeenCalled();
    expect(mockContext.zoom).toHaveBeenCalled();
  });
  it('should apply selected horizon color palette', () => {
    const data = getData(86400);
    data.series = [getValidSerie(width, 1, 86400)];
    mockOptions.color = 'purple';
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    renderFn(mockPanelDiv);

    expect(mockColors).toHaveBeenCalledWith([
      '#705da0',
      '#8f65d8',
      '#a37ff2',
      '#c7b1f9',
      '#e0d1ff',
      '#e0d1ff',
      '#c7b1f9',
      '#a37ff2',
      '#8f65d8',
      '#705da0',
    ]);
  });
  it('should render graph and text when panelDiv and data are valid for more than a 14 day', () => {
    let time = 14 * 86400;
    const data = getData(time);
    data.series = [getValidSerie(width, 1, time)];
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    renderFn(mockPanelDiv);

    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalledWith(d3.timeDay, 2);
    expect(mockContext.horizon).toHaveBeenCalled();
    expect(mockContext.rule).toHaveBeenCalled();
    expect(mockContext.zoom).toHaveBeenCalled();
  });
  it('should render graph and text when panelDiv and data are valid for less than a 14 day', () => {
    let time = 14 * 86400 - 1;
    const data = getData(time);
    data.series = [getValidSerie(width, 1, time)];
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    renderFn(mockPanelDiv);

    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalledWith(d3.timeDay, 1);
    expect(mockContext.horizon).toHaveBeenCalled();
    expect(mockContext.rule).toHaveBeenCalled();
    expect(mockContext.zoom).toHaveBeenCalled();
  });
  it('should render graph and text when panelDiv and data are valid for less than a 1/2 day', () => {
    let time = 86400 / 2 - 1;
    const data = getData(time);
    data.series = [getValidSerie(width, 1, time)];
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    renderFn(mockPanelDiv);

    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalledWith(d3.timeHour, 1);
    expect(mockContext.horizon).toHaveBeenCalled();
    expect(mockContext.rule).toHaveBeenCalled();
    expect(mockContext.zoom).toHaveBeenCalled();
  });
  it('should render graph and text when panelDiv and data are valid for less than a day', () => {
    let time = 86400 - 1;
    const data = getData(time);
    data.series = [getValidSerie(width, 1, time)];
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    renderFn(mockPanelDiv);

    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalledWith(d3.timeHour, 3);
    expect(mockContext.horizon).toHaveBeenCalled();
    expect(mockContext.rule).toHaveBeenCalled();
    expect(mockContext.zoom).toHaveBeenCalled();
  });
  it('should render graph and text when panelDiv and data are valid and called for an hour ', () => {
    const data = getData(3500);
    data.series = [getValidSerie(width, 1, 3500)];
    const renderFn = D3GraphRender(mockContext, data, mockOptions, mockStyles, mockEventBus, jest.fn(), convertAllDataToCubism);
    renderFn(mockPanelDiv);

    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
    expect(mockContext.axis).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalled();
    expect(mockTicks).toHaveBeenCalledWith(d3.timeMinute, 15);
    expect(mockContext.horizon).toHaveBeenCalled();
    expect(mockContext.rule).toHaveBeenCalled();
    expect(mockContext.zoom).toHaveBeenCalled();
  });
});

describe('focusCallback', () => {
  let context: any;
  let mockOptions: any;
  let mockStyles: any;
  let mockPanelDiv: HTMLDivElement;
  let mockEventBus: any;

  beforeEach(() => {
    context = cubism.context();

    mockEventBus = {
      publish: jest.fn(() => {}),
    };

    mockOptions = {
      text: 'Hello, World!',
      automaticExtents: false,
      extentMin: 0,
      extentMax: 100,
      automaticSampling: true,
      sampleType: false,
    };
    mockStyles = {
      'cubism-panel': 'panel',
      cubismgraph: 'graph',
      canvas: 'canvas',
      axis: 'axis',
      horizon: 'horizon',
      rule: 'rule',
      value: 'value',
      title: 'title',
      textBox: 'text-box',
    };

    mockPanelDiv = document.createElement('div');
    Object.defineProperty(mockPanelDiv, 'clientWidth', {
      value: 300,
      writable: false, // Ensuring the property remains read-only
    });
  });
  it('should call eventBus when context.focus() is called', () => {
    const width = 300;
    document.body.innerHTML = '<div id="demo"></div>';

    mockPanelDiv = document.createElement('div');
    Object.defineProperty(mockPanelDiv, 'clientWidth', {
      value: width,
      writable: false, // Ensuring the property remains read-only
    });

    // Mock console functions for testing
    context = cubism.context();
    let data = getData(3500);
    data.series = [getValidSerie(width, 1, 3500)];
    mockEventBus.publish();
    const renderFn = D3GraphRender(context, data, mockOptions, mockStyles, mockEventBus, jest.fn());

    // @ts-ignore
    renderFn(mockPanelDiv);

    context.focus(12);
    expect(mockEventBus.publish).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith({
      origin: undefined,
      payload: {
        point: { time: new Date('2020-09-01T00:18:11.283Z').getTime() },
      },
      type: 'data-hover',
    });
    expect(mockPanelDiv.innerHTML).not.toBe('');
    expect(mockPanelDiv.className).toBe(mockStyles['cubism-panel']);
  });
});

describe('zoomCallbackGen', () => {
  let context: cubism.Context;
  let data: PanelData;
  let options: CubismOptions;

  const getSelection = () => {
    document.body.innerHTML = '<div id="demo"></div>';
    let h = d3.select('#demo');
    return h;
  };
  beforeEach(() => {
    options = createMockOptions('http://example.com');
    context = cubism.context();
    data = getData(86400);
  });
  it('should complain if there is more than one link', () => {
    options = createMockOptions('http://example.com');
    const l = options.links[0];
    options.links.push(l);
    const zoomCallback = zoomCallbackGen(context, data, options);
    enableDebug();
    const oldFunc = console.log;
    console.log = jest.fn();
    const mockSelection = getSelection();
    const oldFunc2 = window.open;
    window.open = jest.fn();

    mockSelection.select = jest.fn().mockReturnValueOnce({ text: jest.fn().mockReturnValue('grafana') });

    zoomCallback(0, 100, mockSelection);
    expect(console.log).toHaveBeenCalledWith(
      'There is more than one link, linked to this graph, will pick the first one'
    );
    console.log = oldFunc;
    window.open = oldFunc2;
  });
  it('should log a message if there are no links to zoom to', () => {
    options = createMockOptions();
    const zoomCallback = zoomCallbackGen(context, data, options);
    enableDebug();
    const oldFunc = console.log;
    console.log = jest.fn();

    zoomCallback(0, 100, getSelection());
    expect(console.log).toHaveBeenCalledWith("Zoom behavior is 'datalink' but no data link is configured");
    console.log = oldFunc;
  });
  it('should open a link in a new tab if targetBlank is true', () => {
    options = createMockOptions('http://example.com/&i=${__field.labels.instance}');
    options.links[0].targetBlank = false;
    const zoomCallback = zoomCallbackGen(context, data, options);
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const mockSelection = getSelection();

    mockSelection.select = jest.fn().mockReturnValueOnce({ text: jest.fn().mockReturnValue('grafana') });

    expect(() => zoomCallback(0, 100, mockSelection)).not.toThrow();
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
  it('should open a link in a new tab if targetBlank is true', () => {
    options = createMockOptions('http://example.com/&i=${__field.labels.instance}');
    const zoomCallback = zoomCallbackGen(context, data, options);
    const oldFunc = window.open;
    window.open = jest.fn();
    const mockSelection = getSelection();

    mockSelection.select = jest.fn().mockReturnValueOnce({ text: jest.fn().mockReturnValue('grafana') });

    zoomCallback(0, 100, mockSelection);
    expect(window.open).toHaveBeenCalledWith(expect.any(String), '_blank', 'noopener,noreferrer');
    window.open = oldFunc;
  });
  it('should throw an error if field is not found', () => {
    const zoomCallback = zoomCallbackGen(context, data, options);
    const mockSelection = getSelection();

    mockSelection.select = jest.fn().mockReturnValueOnce({ text: jest.fn().mockReturnValue('_field.name') });
    expect(() => zoomCallback(0, 100, mockSelection)).toThrowErrorMatchingSnapshot();
  });
  it('should throw an error if there is no associated label with a variable', () => {
    options = createMockOptions('http://example.com/&i=${__field.labels.foo}');
    data.series[0].fields[1].labels = undefined;
    const zoomCallback = zoomCallbackGen(context, data, options);
    const mockSelection = getSelection();

    mockSelection.select = jest.fn().mockReturnValueOnce({ text: jest.fn().mockReturnValue('grafana') });
    expect(() => zoomCallback(0, 100, mockSelection)).toThrow();
  });
  it('should throw an error if there is no labels', () => {
    options = createMockOptions('http://example.com/&i=${__fields.something.instance}');
    const zoomCallback = zoomCallbackGen(context, data, options);
    const mockSelection = getSelection();

    mockSelection.select = jest.fn().mockReturnValueOnce({ text: jest.fn().mockReturnValue('grafana') });
    expect(() => zoomCallback(0, 100, mockSelection)).toThrow();
  });
  it('should throw an error if url is undefined', () => {
    options = createMockOptions('http://example.com/&i=${__fields.something.instance}');
    options.links[0].url = undefined;
    const zoomCallback = zoomCallbackGen(context, data, options);
    const mockSelection = getSelection();

    mockSelection.select = jest.fn().mockReturnValueOnce({ text: jest.fn().mockReturnValue('grafana') });
    expect(() => zoomCallback(0, 100, mockSelection)).toThrow();
  });
  it("should call onChangeTimeRange when zoomBehavior is 'timerange'", () => {
    options = createMockOptions();
    options.zoomBehavior = 'timerange';
    const onChangeTimeRange = jest.fn();
    context._scale.invert = jest.fn((px: number) => new Date(1700000000000 + px * 1000));

    const zoomCallback = zoomCallbackGen(context, data, options, onChangeTimeRange);
    zoomCallback(10, 50, getSelection());

    expect(onChangeTimeRange).toHaveBeenCalledWith({
      from: 1700000010000,
      to: 1700000050000,
    });
  });
  it("should not navigate or change time range when zoomBehavior is 'off'", () => {
    options = createMockOptions('http://example.com');
    options.zoomBehavior = 'off';
    const onChangeTimeRange = jest.fn();
    const oldOpen = global.window.open;
    global.window.open = jest.fn();

    const zoomCallback = zoomCallbackGen(context, data, options, onChangeTimeRange);
    zoomCallback(10, 50, getSelection());

    expect(onChangeTimeRange).not.toHaveBeenCalled();
    expect(global.window.open).not.toHaveBeenCalled();
    global.window.open = oldOpen;
  });
  it("should ignore data links when zoomBehavior is 'timerange'", () => {
    options = createMockOptions('http://example.com');
    options.zoomBehavior = 'timerange';
    const onChangeTimeRange = jest.fn();
    context._scale.invert = jest.fn((px: number) => new Date(px));
    const oldOpen = global.window.open;
    global.window.open = jest.fn();

    const zoomCallback = zoomCallbackGen(context, data, options, onChangeTimeRange);
    zoomCallback(0, 100, getSelection());

    expect(onChangeTimeRange).toHaveBeenCalled();
    expect(global.window.open).not.toHaveBeenCalled();
    global.window.open = oldOpen;
  });
});
