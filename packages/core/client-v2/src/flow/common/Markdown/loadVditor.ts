/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import type VditorType from 'vditor';

// vditor (and its stylesheet) is only needed once a markdown value is rendered or edited, so it is
// imported on demand instead of being part of the boot-critical chunk group. The dynamic imports target
// the external package ids directly: package-level bundles inline relative modules, which would turn a
// static library import back into boot-critical code.
let vditorPromise: Promise<typeof VditorType> | undefined;

export function loadVditor(): Promise<typeof VditorType> {
  return (vditorPromise ??= Promise.all([import('vditor'), import('vditor/dist/index.css')]).then(([m]) => m.default));
}
