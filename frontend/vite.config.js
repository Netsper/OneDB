import { defineConfig, loadEnv } from 'vite';

const isEmbeddedBuild = process.env.ONEDB_EMBEDDED === '1';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    esbuild: {
      // Keep release bundle lean by dropping third-party legal comment banners.
      legalComments: 'none',
    },
    build: {
      // Single-file release mode intentionally inlines all dynamic imports.
      // In this mode, large chunk warnings are expected noise.
      chunkSizeWarningLimit: isEmbeddedBuild ? 1500 : 500,
      modulePreload: false,
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
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost',
          changeOrigin: true,
        },
      },
    },
  };
});
