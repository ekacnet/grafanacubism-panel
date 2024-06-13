import { DashboardLink } from '@grafana/schema';

export enum SamplingType {
  Downsample = 'downsample',
  Upsample = 'upsample',
  Auto = 'auto',
}

export interface CubismOptions {
  text: string;
  extentMin: number;
  extentMax: number;
  automaticExtents: boolean;
  links: DashboardLink[];
}
