declare module 'cubism-es' {
  export interface Context {
    metric: any;
    rule: any;
    horizon: any;
    on: any;
    size(_s: number): Context;
    size(): number;
    axis(): any;
    step(_s: number): number;
    serverDelay(s: number);
    stop();
    setCSSClass(string, string);
  }
  export function context(): Context;
}
