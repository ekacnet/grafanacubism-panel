import { PanelPlugin } from '@grafana/data';
import { CubismOptions } from './types';
import { CubismPanel } from './components/CubismPanel';
import { DataLinksEditor } from './components/DataLinksEditor';

export const plugin = new PanelPlugin<CubismOptions>(CubismPanel).setPanelOptions((builder) => {
  return builder
    .addRadio({
      path: 'zoomBehavior',
      name: 'Zoom behavior',
      description:
        'What happens when you click-drag-release on the chart. Cubism is a bird\'s-eye view — ' +
        'the data-link mode lets you dive into a detail dashboard for the selected range and series.',
      defaultValue: 'datalink',
      settings: {
        options: [
          { value: 'datalink', label: 'Navigate' },
          { value: 'timerange', label: 'Time Range' },
          { value: 'off', label: 'Disable' },
        ],
      },
    })
    .addCustomEditor({
      id: 'links',
      path: 'links',
      name: 'Links',
      category: ['Data Links'],
      editor: DataLinksEditor,
      showIf: (config) => config.zoomBehavior === 'datalink',
    })
    .addBooleanSwitch({
      path: 'automaticExtents',
      name: 'Calculate extent automatically',
      defaultValue: true,
    })
    .addRadio({
      path: 'valueScale',
      name: 'Value scale',
      description: 'Scale used for the metric values in each horizon lane.',
      defaultValue: 'linear',
      settings: {
        options: [
          { value: 'linear', label: 'Linear' },
          { value: 'log', label: 'Logarithmic' },
        ],
      },
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
