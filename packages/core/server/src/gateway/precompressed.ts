/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import fs from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import { extname, normalize, resolve, sep } from 'path';
import { parse } from 'url';

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const ENCODINGS: Array<{ encoding: string; suffix: string }> = [
  { encoding: 'br', suffix: '.br' },
  { encoding: 'gzip', suffix: '.gz' },
];

function acceptsEncoding(req: IncomingMessage, encoding: string) {
  const header = req.headers['accept-encoding'];
  const value = Array.isArray(header) ? header.join(',') : header;
  if (!value) {
    return false;
  }
  return value
    .split(',')
    .some(
      (part) =>
        part.trim().split(';')[0].toLowerCase() === encoding &&
        !part.includes('q=0,') &&
        !/;q=0(\.0+)?$/.test(part.trim()),
    );
}

/**
 * Serve a build-time precompressed sibling (`<file>.br` / `<file>.gz`) of a static asset, if one exists
 * and the client accepts the encoding. Returns true when the response has been handled. Falls back to
 * the regular static pipeline (runtime compression) when no sibling matches, so this is a fast path only.
 */
export function servePrecompressedAsset(
  req: IncomingMessage,
  res: ServerResponse,
  publicDir: string,
  urlPath?: string,
): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }
  const { pathname } = parse(urlPath ?? req.url ?? '');
  if (!pathname) {
    return false;
  }
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (error) {
    return false;
  }
  const ext = extname(decodedPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return false;
  }
  const root = resolve(publicDir);
  const filePath = normalize(resolve(root, `.${decodedPath}`));
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    return false;
  }
  let originalStat: fs.Stats;
  try {
    originalStat = fs.statSync(filePath);
  } catch (error) {
    return false;
  }
  if (!originalStat.isFile()) {
    return false;
  }
  for (const { encoding, suffix } of ENCODINGS) {
    if (!acceptsEncoding(req, encoding)) {
      continue;
    }
    const compressedPath = `${filePath}${suffix}`;
    let compressedStat: fs.Stats;
    try {
      compressedStat = fs.statSync(compressedPath);
    } catch (error) {
      continue;
    }
    // A stale sibling (older than the source it was generated from) must not be served.
    if (!compressedStat.isFile() || compressedStat.mtimeMs < originalStat.mtimeMs) {
      continue;
    }
    const lastModified = originalStat.mtime.toUTCString();
    const ifModifiedSince = req.headers['if-modified-since'];
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Last-Modified', lastModified);
    if (ifModifiedSince && new Date(ifModifiedSince).getTime() >= Math.floor(originalStat.mtimeMs / 1000) * 1000) {
      res.statusCode = 304;
      res.end();
      return true;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Encoding', encoding);
    res.setHeader('Content-Length', compressedStat.size);
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    fs.createReadStream(compressedPath).pipe(res);
    return true;
  }
  return false;
}
