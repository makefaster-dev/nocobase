/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import type MarkdownIt from 'markdown-it';
import mermaidPlugin from './markdown-it-plugins/mermaidPlugin';

// The markdown renderer and its plugins (markdown-it, highlight.js, mermaid) are heavy and only needed
// once a markdown value is actually rendered, so every library is imported on demand here. The dynamic
// imports must target the external package ids directly: package-level bundles inline relative modules,
// which would turn a static library import inside this file back into boot-critical code.
let mdPromise: Promise<MarkdownIt> | undefined;

async function createMd(): Promise<MarkdownIt> {
  const [{ default: MarkdownItCtor }, { default: markdownItHighlightjs }, { default: mermaid }] = await Promise.all([
    import('markdown-it'),
    import('markdown-it-highlightjs'),
    import('mermaid'),
  ]);

  const md = new MarkdownItCtor({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
  });

  md.use(markdownItHighlightjs);
  md.use(mermaidPlugin, { mermaid });
  return md;
}

export function getMd(): Promise<MarkdownIt> {
  return (mdPromise ??= createMd());
}
