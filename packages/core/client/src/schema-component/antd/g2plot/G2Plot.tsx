/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Field } from '@formily/core';
import { observer, useField } from '@formily/react';
import { Spin } from 'antd';
import cls from 'classnames';
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAPIClient } from '../../../api-client';
import { G2PlotDesigner } from './G2PlotDesigner';

export type ReactG2PlotProps<O> = {
  readonly className?: string;
  readonly plot: any;
  readonly config: O;
};

const PLOT_NAMES = [
  'Line',
  'Area',
  'Column',
  'Bar',
  'Pie',
  'Rose',
  'WordCloud',
  'Scatter',
  'Radar',
  'DualAxes',
  'TinyLine',
  'TinyColumn',
  'TinyArea',
  'Histogram',
  'Progress',
  'RingProgress',
  'Heatmap',
  'Box',
  'Violin',
  'Venn',
  'Stock',
  'Funnel',
  'Liquid',
  'Bullet',
  'Sunburst',
  'Gauge',
  'Waterfall',
  'RadialBar',
  'BidirectionalBar',
  'Treemap',
  'Sankey',
  'Chord',
  'CirclePacking',
  'Mix',
  'Facet',
] as const;

// The charting library is heavy and only needed when a chart block actually renders, so it is imported
// on demand instead of being part of the boot-critical chunk group. `plots` is populated once the module
// loads; it starts empty so this module stays synchronous for its public API.
const plots: Record<string, unknown> = {};

let g2plotPromise: Promise<Record<string, unknown>> | undefined;

function loadPlots(): Promise<Record<string, unknown>> {
  return (g2plotPromise ??= import('@antv/g2plot').then((mod: Record<string, unknown>) => {
    for (const name of PLOT_NAMES) {
      plots[name] = mod[name];
    }
    return plots;
  }));
}

function usePlots() {
  const [loadedPlots, setLoadedPlots] = useState<Record<string, unknown> | undefined>();
  useEffect(() => {
    loadPlots()
      .then((value) => setLoadedPlots(() => value))
      .catch(console.error);
  }, []);
  return loadedPlots;
}

export const G2PlotRenderer = forwardRef(function <O = any>(props: ReactG2PlotProps<O>, ref: any) {
  const { className, plot, config } = props;
  const containerRef = useRef(undefined);
  const plotRef = useRef(undefined);

  function syncRef(source, target) {
    if (typeof target === 'function') {
      target(source.current);
    } else if (target) {
      target.current = source.current;
    }
  }

  function renderPlot() {
    if (plotRef.current) {
      plotRef.current.update(config);
    } else {
      plotRef.current = new plot(containerRef.current, config);
      plotRef?.current?.render();
    }

    syncRef(plotRef, ref);
  }

  function destoryPlot() {
    if (plotRef.current) {
      plotRef.current.destroy();
      plotRef.current = undefined;
    }
  }

  useEffect(() => {
    renderPlot();
    return () => destoryPlot();
  }, [config, plot]);

  return <div className={cls(['g2plot', className])} ref={containerRef} />;
});
G2PlotRenderer.displayName = 'G2PlotRenderer';

export const G2Plot: any = observer(
  (props: any) => {
    const { plot, config } = props;
    const field = useField<Field>();
    const { t } = useTranslation();
    const api = useAPIClient();
    const loadedPlots = usePlots();
    useEffect(() => {
      field.data = field.data || {};
      field.data.loading = true;
      const fn = config?.data;
      if (typeof fn === 'function') {
        const result = fn.bind({ api })();
        if (result?.then) {
          result
            .then((data) => {
              if (Array.isArray(data)) {
                field.componentProps.config.data = data;
              }
              field.data.loading = false;
            })
            .catch(console.error);
        } else {
          field.data.loading = false;
        }
      } else {
        field.data.loading = false;
      }
    }, []);

    if (!plot || !config) {
      return <div style={{ opacity: 0.3 }}>{t('In configuration')}...</div>;
    }
    if (field?.data?.loading !== false || !loadedPlots) {
      return <Spin />;
    }
    return (
      <div>
        {field.title && <h2>{field.title}</h2>}
        <G2PlotRenderer
          plot={loadedPlots[plot]}
          config={{
            ...config,
            data: Array.isArray(config?.data) ? config.data : [],
          }}
        />
      </div>
    );
  },
  { displayName: 'G2Plot' },
);

G2Plot.Designer = G2PlotDesigner;
G2Plot.plots = plots;
