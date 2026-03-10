import React, { useRef, useEffect, useMemo } from 'react';
import { DataHoverEvent, PanelProps, PanelData, GrafanaTheme2, EventBus } from '@grafana/data';
import { CubismOptions } from 'types';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import * as cubism from 'cubism-ng';

import { log_debug } from '../misc_utils';
import { D3GraphRender } from './CubismPanelHelper';

interface Props extends PanelProps<CubismOptions> {}

type CSS = string;

type StylesGetter = (theme: GrafanaTheme2) => CSSStyles;

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

// Resolve theme-aware colors. Currently light mode falls back to dark palette
// until a proper light palette is designed; this keeps one source of truth
// instead of an identical if/else.
const resolveColors = (theme: GrafanaTheme2): CubismColors => ({
  backgroundColor: theme.colors.primary.main,
  bodyColor: '#D8D9DA',
  textColor: '#D8D9DA',
  textColorWeak: '#7B7B7B',
  pageBG: '#1f1d1d',
});

const getStyles = (showText: boolean): StylesGetter => {
  return (theme: GrafanaTheme2) => {
    const colors = resolveColors(theme);
    // 28px is the height of the axis
    const innerheight = 'calc(100% - 28px)';
    const outerheight = showText ? 'calc(100% - 2em)' : '100%';
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
}> = ({ data, options, eventBus }) => {
  // cubism.context() allocates scales/listeners; create once per component lifetime,
  // not on every render. All renders reuse contextRef.current.
  const contextRef = useRef<cubism.Context | null>(null);
  if (contextRef.current === null) {
    contextRef.current = cubism.context();
  }
  const context = contextRef.current;

  const showText = options.text !== undefined && options.text !== null && options.text !== '';
  log_debug('Show text is ' + showText);

  // Memoize the styles-getter factory so useStyles2 receives a stable reference
  // and can actually cache the result instead of regenerating CSS every render.
  const stylesGetter = useMemo(() => getStyles(showText), [showText]);
  const styles = useStyles2(stylesGetter);

  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderD3Ref = useRef<HTMLDivElement>(null);
  const lastRenderRef = useRef<number>(Date.now() - 1000);

  useEffect(() => {
    const now = Date.now();
    log_debug('Checking ' + (now - lastRenderRef.current));
    if (renderTimerRef.current) {
      clearTimeout(renderTimerRef.current);
    }

    const doRender = () => {
      lastRenderRef.current = Date.now();
      if (renderD3Ref.current) {
        D3GraphRender(context, data, options, styles, eventBus)(renderD3Ref.current);
      }
    };

    // Throttle: render immediately if it has been >1s since the last render,
    // otherwise debounce for 100ms to avoid thrashing during window resize.
    if (now - lastRenderRef.current > 1000) {
      doRender();
    } else {
      renderTimerRef.current = setTimeout(doRender, 100);
    }

    return () => {
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current);
      }
    };
  }, [context, data, options, styles, eventBus]);

  useEffect(() => {
    const sub = eventBus.getStream(DataHoverEvent).subscribe((data: DataHoverEvent) => {
      adjustCubismCrossHair(context, data);
    });
    return () => {
      context.stop();
      sub.unsubscribe();
    };
  }, [context, eventBus]);

  return <div ref={renderD3Ref} />;
}


export const CubismPanel: React.FC<Props> = ({ options, data, width, height, eventBus }) => {
  return (
      <D3Graph height={height} width={width} data={data} options={options} eventBus={eventBus}  />
  );
};
