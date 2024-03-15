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
  }
  export function context(): Context;
}
