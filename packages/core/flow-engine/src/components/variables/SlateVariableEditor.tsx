/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Spin } from 'antd';
import React, { Suspense } from 'react';
import type { SlateVariableEditorProps } from './SlateVariableEditorInner';

// The slate editor stack is heavy and only needed once a variable editor actually renders, so the real
// implementation is loaded on demand and stays out of the boot-critical chunk group.
const LazySlateVariableEditor = React.lazy(() =>
  import('./SlateVariableEditorInner').then((m) => ({ default: m.SlateVariableEditorInner })),
);

export type { SlateVariableEditorProps } from './SlateVariableEditorInner';

export const SlateVariableEditor: React.FC<SlateVariableEditorProps> = (props) => (
  <Suspense fallback={<Spin size="small" />}>
    <LazySlateVariableEditor {...props} />
  </Suspense>
);
