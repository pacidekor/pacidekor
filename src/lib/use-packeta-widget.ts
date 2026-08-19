"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPacketaWidgetConfig,
  PACKETA_WIDGET_SCRIPT_URL,
  toPacketaPointSelection,
  type PacketaPointSelection,
} from "@/lib/packeta";
import type { PacketaPoint } from "@/types/packeta";

const SCRIPT_ID = "packeta-widget-library";

let scriptPromise: Promise<void> | null = null;

function loadPacketaScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Packeta widget je dostupný len v prehliadači."));
  }

  if (window.Packeta?.Widget?.pick) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      if (window.Packeta?.Widget?.pick) {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Nepodarilo sa načítať Packeta widget.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = PACKETA_WIDGET_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Nepodarilo sa načítať Packeta widget."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function usePacketaWidget() {
  const config = getPacketaWidgetConfig();
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!config.apiKey) return;

    let cancelled = false;

    loadPacketaScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => {
        if (!cancelled) setScriptReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config.apiKey]);

  const openPicker = useCallback(
    async (onSelect: (selection: PacketaPointSelection | null) => void) => {
      if (!config.apiKey) {
        throw new Error("Chýba NEXT_PUBLIC_PACKETA_API_KEY.");
      }

      setLoading(true);

      try {
        await loadPacketaScript();

        window.Packeta!.Widget.pick(
          config.apiKey,
          (point: PacketaPoint | null) => {
            setLoading(false);
            if (!point) {
              onSelect(null);
              return;
            }

            onSelect(toPacketaPointSelection(point));
          },
          {
            language: config.language,
            country: config.country,
            webUrl: config.webUrl || undefined,
            appIdentity: config.appIdentity,
          },
        );
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [config],
  );

  return {
    openPicker,
    loading,
    scriptReady,
    configured: Boolean(config.apiKey),
  };
}
