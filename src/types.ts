import { DashboardLink } from '@grafana/schema';

export type ZoomBehavior = 'datalink' | 'timerange' | 'off';
export type HorizonColor = 'green' | 'blue' | 'purple' | 'yellow' | 'orange' | 'red';

export interface CubismOptions {
  text: string;
  extentMin: number;
  extentMax: number;
  automaticExtents: boolean;
  color?: HorizonColor;
  links: DashboardLink[];
  zoomBehavior: ZoomBehavior;
}
