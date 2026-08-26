/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React, { Suspense, useEffect, useState } from 'react';
import type * as AntdMobileNS from 'antd-mobile';

// antd-mobile is a heavy bundle that only matters on mobile field interactions, so it is imported on
// demand instead of being part of the boot-critical chunk group. The dynamic imports target the external
// package id directly: package-level bundles inline relative modules, which would turn a static library
// import back into boot-critical code.
let antdMobilePromise: Promise<typeof AntdMobileNS> | undefined;

export function loadAntdMobile(): Promise<typeof AntdMobileNS> {
  return (antdMobilePromise ??= import('antd-mobile'));
}

/**
 * Returns the antd-mobile module namespace once it has loaded, or undefined while it is still loading.
 * Use this when a component needs antd-mobile hooks or compound components that a lazy component
 * wrapper cannot expose.
 */
export function useAntdMobile(): typeof AntdMobileNS | undefined {
  const [mod, setMod] = useState<typeof AntdMobileNS>();
  useEffect(() => {
    loadAntdMobile()
      .then((m) => setMod(() => m))
      .catch(console.error);
  }, []);
  return mod;
}

function lazyAntdMobileComponent<K extends keyof typeof AntdMobileNS>(name: K): (typeof AntdMobileNS)[K] {
  const Lazy = React.lazy(() =>
    loadAntdMobile().then((m) => ({ default: m[name] as React.ComponentType<Record<string, unknown>> })),
  );
  const Component = (props: Record<string, unknown>) => (
    <Suspense fallback={null}>
      <Lazy {...props} />
    </Suspense>
  );
  return Component as unknown as (typeof AntdMobileNS)[K];
}

export const DatePicker = lazyAntdMobileComponent('DatePicker');
export const Picker = lazyAntdMobileComponent('Picker');
export const Popup = lazyAntdMobileComponent('Popup');
export const SearchBar = lazyAntdMobileComponent('SearchBar');
export const Button = lazyAntdMobileComponent('Button');
export const SpinLoading = lazyAntdMobileComponent('SpinLoading');

const LazyCheckListRoot = React.lazy(() => loadAntdMobile().then((m) => ({ default: m.CheckList })));
const LazyCheckListItem = React.lazy(() => loadAntdMobile().then((m) => ({ default: m.CheckList.Item })));

// CheckList is a compound component (CheckList.Item), which a plain lazy component cannot express.
export const CheckList = Object.assign(
  (props: Record<string, unknown>) => (
    <Suspense fallback={null}>
      <LazyCheckListRoot {...props} />
    </Suspense>
  ),
  {
    Item: (props: Record<string, unknown>) => (
      <Suspense fallback={null}>
        <LazyCheckListItem {...props} />
      </Suspense>
    ),
  },
) as unknown as typeof AntdMobileNS.CheckList;
