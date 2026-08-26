/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const brotliCompress = promisify(zlib.brotliCompress);
const gzipCompress = promisify(zlib.gzip);

// Text-based asset types that compress well; binary formats (fonts, images, media) are skipped because
// woff2/png/jpg are already compressed and recompressing them wastes build time for no byte savings.
const COMPRESSIBLE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.svg', '.json', '.txt', '.map']);
const MIN_SIZE_BYTES = 1024;
const CONCURRENCY = 4;

async function compressFile(file: string, size: number) {
  const source = await fs.readFile(file);
  const [brotli, gzip] = await Promise.all([
    brotliCompress(source, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: size,
      },
    }),
    gzipCompress(source, { level: zlib.constants.Z_BEST_COMPRESSION }),
  ]);
  // Only keep siblings that actually save bytes, so the server never serves a "compressed" file bigger
  // than the original.
  if (brotli.length < size) {
    await fs.writeFile(`${file}.br`, brotli);
  }
  if (gzip.length < size) {
    await fs.writeFile(`${file}.gz`, gzip);
  }
}

async function collectFiles(dir: string): Promise<Array<{ file: string; size: number }>> {
  const out: Array<{ file: string; size: number }> = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(full)));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!COMPRESSIBLE_EXTENSIONS.has(ext)) {
      continue;
    }
    const stat = await fs.stat(full);
    if (stat.size < MIN_SIZE_BYTES) {
      continue;
    }
    out.push({ file: full, size: stat.size });
  }
  return out;
}

/**
 * Generate `.br` and `.gz` siblings for every compressible static asset under `dir`, so the gateway can
 * stream a precompressed body instead of re-compressing the same immutable file on every request.
 */
export async function precompressDirectory(dir: string): Promise<void> {
  if (!(await fs.pathExists(dir))) {
    return;
  }
  const files = await collectFiles(dir);
  let index = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
    while (index < files.length) {
      const item = files[index++];
      await compressFile(item.file, item.size);
    }
  });
  await Promise.all(workers);
}
