import { defineConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

// This config file is only present because it is needed for Ladle.
export default defineConfig({
  plugins: [
    vanillaExtractPlugin(),
  ],
});
