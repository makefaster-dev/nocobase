/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */
import type { Html5Qrcode } from 'html5-qrcode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// html5-qrcode is a heavy bundle that is only needed once a scanner actually opens, so it is imported
// on demand instead of being part of the boot-critical chunk group.
let html5QrcodePromise: Promise<typeof import('html5-qrcode')> | undefined;
export const loadHtml5Qrcode = () => (html5QrcodePromise ??= import('html5-qrcode'));

export function useScanner({ onScannerSizeChanged, elementId, onScanSuccess }) {
  const [scanner, setScanner] = useState<Html5Qrcode>();

  const { t } = useTranslation();
  const viewPoint = useMemo(() => {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    return { width: vw, height: vh };
  }, []);

  const startScanCamera = useCallback(
    async (scanner: Html5Qrcode) => {
      return scanner.start(
        {
          facingMode: 'environment',
        },
        {
          fps: 10,
          qrbox(width, height) {
            const minEdge = Math.min(width, height);
            onScannerSizeChanged({ width, height });
            return { width: viewPoint.width, height: viewPoint.height };
          },
        },
        (text) => {
          onScanSuccess && onScanSuccess(text);
        },
        undefined,
      );
    },
    [onScannerSizeChanged, viewPoint, onScanSuccess],
  );
  const stopScanner = useCallback(async (scanner: Html5Qrcode) => {
    const { Html5QrcodeScannerState } = await loadHtml5Qrcode();
    const state = scanner.getState();
    if ([Html5QrcodeScannerState.SCANNING, Html5QrcodeScannerState.PAUSED].includes(state)) {
      return scanner.stop();
    } else return;
  }, []);

  const startScanFile = useCallback(
    async (file: File) => {
      await stopScanner(scanner);
      try {
        const { decodedText } = await scanner.scanFileV2(file, false);
        onScanSuccess && onScanSuccess(decodedText);
      } catch (error) {
        alert(t('QR code recognition failed, please scan again'));
        startScanCamera(scanner);
      }
    },
    [stopScanner, scanner, t, startScanCamera, onScanSuccess],
  );

  useEffect(() => {
    const el = document.getElementById(elementId);
    if (!el) return; // 容器还没挂载，跳过
    if (scanner) return; // 避免重复初始化

    let disposed = false;
    let instance: Html5Qrcode | undefined;
    const setupScanner = async () => {
      const { Html5Qrcode } = await loadHtml5Qrcode();
      if (disposed) return;
      instance = new Html5Qrcode(elementId);
      setScanner(instance);
      startScanCamera(instance);
    };
    setupScanner().catch(console.error);

    return () => {
      disposed = true;
      if (instance) {
        stopScanner(instance);
      }
    };
  }, [elementId]);

  return { startScanCamera, startScanFile };
}
