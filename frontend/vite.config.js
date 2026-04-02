import { defineConfig } from 'vite';

const isEmbeddedBuild = process.env.ONEDB_EMBEDDED === '1';

export default defineConfig({
  build: {
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
