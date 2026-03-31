import { DashboardLink } from '@grafana/schema';

export type ZoomBehavior = 'datalink' | 'timerange' | 'off';
export type ValueScale = 'linear' | 'log';

export interface CubismOptions {
  text: string;
  extentMin: number;
  extentMax: number;
  automaticExtents: boolean;
  valueScale?: ValueScale;
  links: DashboardLink[];
  zoomBehavior: ZoomBehavior;
}
