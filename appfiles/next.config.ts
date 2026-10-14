import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: import.meta.dirname,
    rules: {
      // The Tailwind loader is required for `@import "tailwindcss"`, but it must
      // never touch *.module.css: `as: "*.css"` re-types the file as a plain
      // stylesheet, so Turbopack skips its CSS-module pass and no class-name map
      // is emitted — every `styles.foo` becomes `undefined`. Excluded here
      // because a `*.css` pattern matches on file name and would catch modules.
      "*.css": {
        condition: { all: [{ not: { path: /\.module\.css$/ } }] },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
