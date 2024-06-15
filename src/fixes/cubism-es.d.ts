declare module 'cubism-es' {
  export type d3Selection = d3.Selection<BaseType, unknown, HTMLElement, any>;
  export type zoomCallback = (param1: number, param2: number, param3: d3Selection) => void;
  export interface ZoomContext {
    render(d3Selection);
    setZoomType(string);
  }

  export type Metric = MetricValue | null;
  export interface MetricValue {}

  export interface Context {
    metric(): () => Metric[];
    rule: any;
    horizon: any;
    on: any;
    size(_s: number): Context;
    size(): number;
    axis(): any;
    step(_s: number): number;
    serverDelay(s: number);
    stop();
    zoom(f?: zoomCallback): ZoomContext;
    setCSSClass(string, string);
    getCSSClass(string): string;
    focus(number);
    _scale: d3.scale;
  }

  export function context(): Context;
}
