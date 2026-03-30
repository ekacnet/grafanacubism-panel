import { DashboardLink } from '@grafana/schema';

export type ZoomBehavior = 'datalink' | 'timerange' | 'off';

export interface CubismOptions {
  text: string;
  extentMin: number;
  extentMax: number;
  automaticExtents: boolean;
  links: DashboardLink[];
  zoomBehavior: ZoomBehavior;
}
