import { PanelPlugin } from '@grafana/data';
import { CubismOptions } from './types';
import { CubismPanel } from './components/CubismPanel';

export const plugin = new PanelPlugin<CubismOptions>(CubismPanel).setPanelOptions((builder) => {
  return builder
    .addBooleanSwitch({
      path: 'automaticExtents',
      name: 'Let cubism calculate the extent automatically',
      defaultValue: true,
    })
    .addNumberInput({
      path: 'extentMax',
      name: 'Extent max',
      defaultValue: 10,
      showIf: (config) => config.automaticExtents === false,
    })
    .addNumberInput({
      path: 'extentMin',
      name: 'Extent min',
      defaultValue: -10,
      showIf: (config) => config.automaticExtents === false,
    })
    .addTextInput({
      path: 'text',
      name: 'Bottom label',
      description: 'This is a label that is added at the bottom of the graph',
      defaultValue: '',
    });
});
