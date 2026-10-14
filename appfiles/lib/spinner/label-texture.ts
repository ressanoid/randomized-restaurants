import type * as Three from "three";

type ThreeModule = typeof import("three");

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 394;
const INSET = 10;
const CORNER_RADIUS = 38;
const TEXT_PADDING = 34;
const MAX_LINES = 3;
const FONT_SIZE = 34;
const LINE_SPACING = FONT_SIZE * 1.2;
const FONT = `600 ${FONT_SIZE}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

export interface LabelPalette {
  fill: string;
  stroke: string;
  text: string;
}

/**
 * The cards render onto the page background rather than a fixed backdrop, so the
 * palette has to follow the colour scheme — white text on a white page is invisible.
 */
export const LABEL_PALETTES: Record<"light" | "dark", LabelPalette> = {
  light: {
    // Mirrors the app's own light-mode surfaces: a white card defined by its border.
    fill: "rgba(255, 255, 255, 0.90)",
    stroke: "rgba(15, 23, 42, 0.18)",
    text: "#0f172a",
  },
  dark: {
    fill: "rgba(255, 255, 255, 0.14)",
    stroke: "rgba(255, 255, 255, 0.32)",
    text: "#ffffff",
  },
};

/** Trim `text` until it fits `maxWidth`, appending an ellipsis. */
const ellipsize = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string => {
  let candidate = text;
  while (candidate.length > 0 && context.measureText(`${candidate}…`).width > maxWidth) {
    candidate = candidate.slice(0, -1);
  }
  return `${candidate}…`;
};

/** Greedy word wrap capped at `maxLines`, ellipsizing the last line if it spills. */
export const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = "";
  let index = 0;

  while (index < words.length && lines.length < maxLines) {
    const candidate = line ? `${line} ${words[index]}` : words[index];
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = "";
      continue;
    }
    line = candidate;
    index += 1;
  }

  if (line) lines.push(line);
  if (lines.length === 0) return lines;

  const last = lines[lines.length - 1];
  const spilled = index < words.length;
  if (spilled || context.measureText(last).width > maxWidth) {
    lines[lines.length - 1] = ellipsize(context, last, maxWidth);
  }

  return lines;
};

/** Draw a rounded name card onto a canvas and hand it back as a GPU texture. */
export const createLabelTexture = (
  THREE: ThreeModule,
  label: string,
  palette: LabelPalette = LABEL_PALETTES.dark,
): Three.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to acquire a 2D canvas context");

  context.beginPath();
  context.roundRect(
    INSET,
    INSET,
    TEXTURE_WIDTH - INSET * 2,
    TEXTURE_HEIGHT - INSET * 2,
    CORNER_RADIUS,
  );
  context.fillStyle = palette.fill;
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = palette.stroke;
  context.stroke();

  context.font = FONT;
  context.fillStyle = palette.text;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const lines = wrapText(context, label, TEXTURE_WIDTH - TEXT_PADDING * 2, MAX_LINES);
  const firstLineY = TEXTURE_HEIGHT / 2 - ((lines.length - 1) * LINE_SPACING) / 2;
  lines.forEach((line, row) => {
    context.fillText(line, TEXTURE_WIDTH / 2, firstLineY + row * LINE_SPACING);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};
