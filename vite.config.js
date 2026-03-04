import { defineConfig } from 'vite';

export default defineConfig({
  // Expose WGSL files as raw strings via ?raw import
  assetsInclude: ['**/*.wgsl'],
});
