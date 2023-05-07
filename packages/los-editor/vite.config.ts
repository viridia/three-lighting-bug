import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import solid from 'vite-plugin-solid';
import solidSvg from 'vite-plugin-solid-svg';
import path from 'path';

export default defineConfig({
  plugins: [
    solid(),
    solidSvg(),
    wasm(),
    topLevelAwait(),
    vanillaExtractPlugin(),
  ],
  server: {
    port: 3000,
  },
  assetsInclude: ['**/*.png'],
});
