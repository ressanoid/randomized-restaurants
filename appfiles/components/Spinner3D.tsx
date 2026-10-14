"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Restaurant } from "@/lib/qloo/types";
import { createDrum, type Drum } from "@/lib/spinner/drum";
import { LABEL_PALETTES } from "@/lib/spinner/label-texture";

export const SPINNER_MAX_ITEMS = 12;

const SPIN_MS = 2800;
const HOLD_MS = 420;
const TURNS = 3;
/** Reveal anyway if rAF or the settle timer never lands, so the UI can't wedge. */
const SETTLE_TIMEOUT_MS = SPIN_MS + HOLD_MS + 1200;
/** When WebGL is unavailable the fallback list just shows, then settles. */
const FALLBACK_SETTLE_MS = 900;
const EDGE_FADE =
  "linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)";

/** Names are joined on this to derive a stable dependency key for the drum. */
const LABEL_SEPARATOR = "\u0000";

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

// matchMedia is an external store, so read it through useSyncExternalStore rather
// than mirroring it into state from an effect (which renders twice and briefly
// paints the light cards on a dark page).
const subscribeToColorScheme = (onChange: () => void) => {
  const query = window.matchMedia(DARK_MODE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const readColorScheme = () => window.matchMedia(DARK_MODE_QUERY).matches;
/** The server cannot know the preference; assume light, matching the CSS default. */
const readServerColorScheme = () => false;

interface Spinner3DProps {
  items: Restaurant[];
  targetIndex: number;
  spinning: boolean;
  onSettled: () => void;
}

/**
 * three.js carousel that spins and lands with the chosen restaurant facing the
 * viewer. `three` is imported on demand so it never reaches the server bundle.
 */
export function Spinner3D({ items, targetIndex, spinning, onSettled }: Spinner3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  const [drum, setDrum] = useState<Drum | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const dark = useSyncExternalStore(
    subscribeToColorScheme,
    readColorScheme,
    readServerColorScheme,
  );

  const visible = items.slice(0, SPINNER_MAX_ITEMS);
  const labelKey = visible.map((item) => item.name).join(LABEL_SEPARATOR);
  // Tailwind's `dark:` follows the OS preference here, so the cards must too.
  const palette = dark ? LABEL_PALETTES.dark : LABEL_PALETTES.light;

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  const settle = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    onSettledRef.current();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || labelKey.length === 0) return;

    let disposed = false;
    let created: Drum | null = null;

    const build = async () => {
      try {
        const THREE = await import("three");
        if (disposed) return;

        created = createDrum(THREE, container, {
          labels: labelKey.split(LABEL_SEPARATOR),
          palette,
          spinMs: SPIN_MS,
          holdMs: HOLD_MS,
          turns: TURNS,
          onSettled: settle,
        });
        setDrum(created);
      } catch {
        if (!disposed) setWebglFailed(true);
      }
    };

    void build();

    return () => {
      disposed = true;
      created?.dispose();
      setDrum(null);
    };
  }, [labelKey, palette, settle]);

  useEffect(() => {
    if (!spinning || !drum) return;

    settledRef.current = false;
    drum.spin(Math.min(Math.max(targetIndex, 0), drum.count - 1));

    const timer = window.setTimeout(settle, SETTLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [spinning, drum, targetIndex, settle]);

  useEffect(() => {
    if (!webglFailed || !spinning) return;

    settledRef.current = false;
    const timer = window.setTimeout(settle, FALLBACK_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [webglFailed, spinning, settle]);

  if (webglFailed) {
    return (
      <ul className="flex h-full flex-wrap content-center items-center justify-center gap-2 overflow-hidden">
        {visible.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-xs dark:border-white/15 dark:bg-white/10"
          >
            {item.name}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
    />
  );
}
