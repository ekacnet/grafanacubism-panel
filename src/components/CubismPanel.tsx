import React, {useEffect} from 'react';
import { DataHoverEvent, PanelProps, PanelData, GrafanaTheme2, EventBus } from '@grafana/data';
import { CubismOptions } from 'types';
import { css } from '@emotion/css';
import {  useStyles2, useTheme2 } from '@grafana/ui';
import * as cubism from 'cubism-es';

import { config } from '@grafana/runtime';
import { log_debug } from '../misc_utils';
import { D3GraphRender } from './CubismPanelHelper';

interface Props extends PanelProps<CubismOptions> {}

type CSS = string;

type StylesGetter = () => CSSStyles

interface CSSStyles {
  [ key: string ]: CSS
};

interface CubismColors {
  bodyColor: CSS
  textColor: CSS
  textColorWeak: CSS
  backgroundColor: CSS
  pageBG: CSS
}

const getStyles = (showText: boolean, theme: GrafanaTheme2): StylesGetter => {
  const colors: CubismColors = {
    bodyColor:"",
    textColor: "",
    textColorWeak: "",
    backgroundColor: "",
    pageBG: ""
  }

  colors.backgroundColor = theme.colors.primary.main;

  if (config.theme2.isDark) {
    colors.bodyColor="#D8D9DA";
    colors.textColor = "#D8D9DA";
    colors.textColorWeak="#7B7B7B";
    colors.pageBG="#1f1d1d";
  } else {
    colors.bodyColor="#D8D9DA";
    colors.textColor = "#D8D9DA";
    colors.textColorWeak="#7B7B7B";
    colors.pageBG="#1f1d1d";
  }

  return function () {
    // 28px is the height of the axis
    let innerheight = 'calc(100% - 28px)';
    let outerheight = '100%';
    if (showText) {
      outerheight = 'calc(100% - 2em)';
    }
    return {
      'zoom': css`
        label: cubism-zoom;
      `,
      'cubism-panel': css`
        label: cubism-panel;
        height: 100%;
        font-family: Open Sans;
        position: relative;
        overflow: hidden;
      `,
      'cubismgraph': css`
        label: cubism-graph;
        position: relative;
        height: ${outerheight};
        overflow: hidden;
      `,
      'canvas': css`
        label: canvas;
        overflow: auto;
        height: ${innerheight};
      `,
      'textBox': css`
        max-height: 2em;
      `,
      'rule': css`
        & {
          background-color: ${colors.backgroundColor};
        }
        & .lineCubism {
          background: ${colors.bodyColor};
          //opacity: .2;
          z-index: 2;
        }
      `,
      'line': 'lineCubism',
      'value': 'valueCubism',
      'title': 'titleCubism',
      'axis': css`
        & {
          label: axis;
          font: 10px sans-serif;
        }
        & line {
          fill: none;
          stroke: ${colors.bodyColor};
          shape-rendering: crispEdges;
          stroke: ${colors.textColorWeak};
          shape-rendering: crispEdges;
        }

        & text {
          -webkit-transition: fill-opacity 250ms linear;
          color: ${colors.textColorWeak};
          fill: currentColor;
        }

        & path {
          display: none;
        }

      `,
      'horizon': css`
        & {
            label: horizon;
            border-bottom: solid 1px ${colors.textColorWeak};
            overflow: hidden;
            position: relative;
        }

        & {
            border-top: solid 1px ${colors.textColorWeak};
            border-bottom: solid 1px ${colors.textColorWeak};
        }

        & + & {
            border-top-style: none ;
        }

        & canvas {
            display: block;
        }

        & .titleCubism, & .valueCubism {
            bottom: 0;
            color: ${colors.textColor};
            line-height: 30px;
            margin: 0 6px;
            position: absolute;
            text-shadow: -1px -1px 0 ${colors.pageBG}, 1px -1px 0 ${colors.pageBG}, -1px 1px 0 ${colors.pageBG}, 1px 1px 0 ${colors.pageBG};
            white-space: nowrap
        }

        & .titleCubism {
          left: 0;
        }
        & .valueCubism {
          right: 0;
        }

      `,

    };
  };
};

export const adjustCubismCrossHair = (context: cubism.Context, hoverEventData: DataHoverEvent) => {
  if (hoverEventData.payload!.data) {
    let ts = hoverEventData.payload.data.fields[0].values[hoverEventData.payload.rowIndex!];
    let index = context._scale(new Date(ts))
    context.focus(Math.floor(index))
  }
}

export const D3Graph: React.FC<{
  height: number;
  width: number;
  data: PanelData;
  options: CubismOptions;
  eventBus: EventBus;
}> = ({ height, width, data, options, eventBus }) => {
  let context = cubism.context();
  let showText = false;
  if (options.text !== undefined && options.text !== null && options.text !== '') {
    showText = true;
  }
  log_debug('Show text is ', showText);
  const styles = useStyles2(getStyles(showText, useTheme2()));
  // useState() ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const renderD3 = React.useCallback(
     D3GraphRender(context, data,  options, styles, eventBus)
    , [context, data, options, styles]
  )
  useEffect(() => {
    // Like componentDidMount()
    let subscribe = eventBus.getStream(DataHoverEvent).subscribe((data)=>{
      adjustCubismCrossHair(context, data);
     });
    return () => {
      context.stop();
      subscribe.unsubscribe();
    };
  });
  return <div
    ref={renderD3} />;
};

export const CubismPanel: React.FC<Props> = ({ options, data, width, height, eventBus }) => {
  return (
      <D3Graph height={height} width={width} data={data} options={options} eventBus={eventBus}  />
  );
};
