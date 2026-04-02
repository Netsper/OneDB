import { defineConfig } from 'vite';

const isEmbeddedBuild = process.env.ONEDB_EMBEDDED === '1';

export default defineConfig({
  build: {
    // Single-file release mode intentionally inlines all dynamic imports.
    // In this mode, large chunk warnings are expected noise.
    chunkSizeWarningLimit: isEmbeddedBuild ? 1500 : 500,
    cssCodeSplit: !isEmbeddedBuild,
    rollupOptions: isEmbeddedBuild
      ? {
          output: {
            inlineDynamicImports: true,
          },
        }
      : {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              if (id.includes('react')) return 'react-vendor';
              if (id.includes('xlsx')) return 'xlsx-vendor';
              if (id.includes('jszip')) return 'zip-vendor';
              return 'vendor';
            },
          },
        },
  },
});
