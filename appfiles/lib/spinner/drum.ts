import type * as Three from "three";
import { createLabelTexture, type LabelPalette } from "./label-texture";

type ThreeModule = typeof import("three");

export const TAU = Math.PI * 2;
export const CARD_WIDTH = 1.3;
export const CARD_HEIGHT = 1;

/** Below this the drum looks like a flat row rather than a carousel. */
const MIN_RADIUS = 1.7;
/** Gap between adjacent cards, as a multiple of card width. */
const CARD_GAP = 1.15;
const FIELD_OF_VIEW = 45;
/** Framing box, expressed in card-heights/widths, so the front card keeps a margin. */
const FRAME_HEIGHT = CARD_HEIGHT * 1.75;
const FRAME_WIDTH = CARD_WIDTH * 1.4;
const MAX_PIXEL_RATIO = 2;
const ASPECT_FALLBACK = 16 / 9;

export interface DrumOptions {
  labels: readonly string[];
  /** Colours for the name cards, matched to the active colour scheme. */
  palette: LabelPalette;
  spinMs: number;
  /** Pause on the winning card before `onSettled` fires. */
  holdMs: number;
  /** Extra full turns added to every spin, on top of the alignment turn. */
  turns: number;
  onSettled: () => void;
}

export interface Drum {
  readonly count: number;
  spin(targetIndex: number): void;
  dispose(): void;
}

const easeOutCubic = (progress: number): number => 1 - (1 - progress) ** 3;

/** Fold an angle into `(-TAU, 0]` without changing where it points. */
const wrapAngle = (angle: number): number => {
  const remainder = angle % TAU;
  return remainder > 0 ? remainder - TAU : remainder;
};

/** Circumference that keeps `count` cards `CARD_GAP` apart, floored at MIN_RADIUS. */
export const drumRadius = (count: number): number =>
  count <= 1 ? MIN_RADIUS : Math.max(MIN_RADIUS, (CARD_WIDTH * CARD_GAP * count) / TAU);

/**
 * Largest angle at or below `current` that still points the same way as `target`.
 * Rotating there always travels counter-clockwise, so a spin never jumps.
 */
export const align = (target: number, current: number): number => {
  const turns = Math.ceil((target - current) / TAU);
  return target - TAU * turns;
};

/**
 * Build a three.js carousel of name cards inside `container` and keep it sized to
 * that element. The canvas is created here rather than passed in: a `<canvas>`
 * yields exactly one WebGL context for its lifetime, so giving every drum its own
 * canvas keeps remounts (and StrictMode's double-invoke) from resurrecting a lost
 * context.
 */
export const createDrum = (
  THREE: ThreeModule,
  container: HTMLElement,
  options: DrumOptions,
): Drum => {
  const { labels, palette, spinMs, holdMs, turns, onSettled } = options;
  const count = labels.length;

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, ASPECT_FALLBACK, 0.1, 100);

  const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
  const materials: Three.MeshBasicMaterial[] = [];
  const drum = new THREE.Group();
  const radius = drumRadius(count);
  const step = count > 0 ? TAU / count : TAU;

  labels.forEach((label, index) => {
    const texture = createLabelTexture(THREE, label, palette);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    materials.push(material);

    const card = new THREE.Mesh(geometry, material);
    const angle = index * step;
    // Sit on the circle and face away from the axis, so the front card meets the camera.
    card.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    card.rotation.y = angle;
    drum.add(card);
  });

  scene.add(drum);

  let animationFrame = 0;
  let settleTimer = 0;
  let fromRotation = 0;
  let toRotation = 0;
  let startedAt = 0;

  const draw = () => renderer.render(scene, camera);

  const fit = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    const halfFrame = Math.tan((FIELD_OF_VIEW * Math.PI) / 360);

    // The front card sits `radius` closer than the axis, so pull the camera back by it.
    const distanceForHeight = FRAME_HEIGHT / 2 / halfFrame;
    const distanceForWidth = FRAME_WIDTH / 2 / (halfFrame * aspect);

    camera.aspect = aspect;
    camera.position.set(0, 0, radius + Math.max(distanceForHeight, distanceForWidth));
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    draw();
  };

  const tick = (now: number) => {
    const progress = Math.min((now - startedAt) / spinMs, 1);
    drum.rotation.y = fromRotation + (toRotation - fromRotation) * easeOutCubic(progress);
    draw();

    if (progress < 1) {
      animationFrame = requestAnimationFrame(tick);
      return;
    }

    animationFrame = 0;
    settleTimer = window.setTimeout(onSettled, holdMs);
  };

  const spin = (targetIndex: number) => {
    if (count === 0) return;

    cancelAnimationFrame(animationFrame);
    window.clearTimeout(settleTimer);

    // Rebase first so the window cards sit at a small, stable angle.
    drum.rotation.y = wrapAngle(drum.rotation.y);
    fromRotation = drum.rotation.y;

    const clamped = Math.min(Math.max(Math.trunc(targetIndex), 0), count - 1);
    toRotation = align(-clamped * step, fromRotation) - TAU * turns;
    startedAt = performance.now();
    animationFrame = requestAnimationFrame(tick);
  };

  const observer = new ResizeObserver(fit);
  observer.observe(container);
  fit();

  return {
    count,
    spin,
    dispose: () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
      observer.disconnect();

      geometry.dispose();
      for (const material of materials) {
        material.map?.dispose();
        material.dispose();
      }

      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
};
