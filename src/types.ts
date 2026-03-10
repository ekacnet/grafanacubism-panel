import { DashboardLink } from '@grafana/schema';

export interface CubismOptions {
  text: string;
  extentMin: number;
  extentMax: number;
  automaticExtents: boolean;
  links: DashboardLink[];
}
