import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import checker from 'vite-plugin-checker';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getSecurityHeaders = (isProduction: boolean) => {
  const baseDirectives = [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  const cspProd = [
    ...baseDirectives,
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https:",
    "upgrade-insecure-requests",
  ].join('; ');

  return {
    'Content-Security-Policy': isProduction ? cspProd : '',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-XSS-Protection': '1; mode=block',
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isProd = mode === 'production';

  const PORT = Number(env.VITE_PORT) || 5000;
  const PREVIEW_PORT = Number(env.VITE_PREVIEW_PORT) || 8080;

  return {
    root: __dirname,
    base: '/',

    plugins: [
      react(),

      checker({
        typescript: true,
        overlay: { initialIsOpen: false, position: 'br' },
        enableBuild: false,
      }),

      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
        deleteOriginFile: false,
        verbose: false,
      }),

      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        deleteOriginFile: false,
        verbose: false,
      }),

      visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }) as PluginOption,
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '/src': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@assets': path.resolve(__dirname, 'src/assets'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@context': path.resolve(__dirname, 'src/context'),
      },
    },

    server: {
      port: PORT,
      strictPort: false,
      host: '0.0.0.0',
      allowedHosts: true,
      cors: false,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      ...(env.VITE_API_URL ? {
        proxy: {
          '/api': {
            target: env.VITE_API_URL,
            changeOrigin: true,
            secure: isProd,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        }
      } : {}),
    },

    preview: {
      port: PREVIEW_PORT,
      strictPort: true,
      host: true,
      headers: getSecurityHeaders(true),
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProd,
      minify: 'terser',
      cssCodeSplit: true,
      target: 'es2020',

      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks(id: string) {
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/react-is') ||
              id.includes('node_modules/prop-types')
            ) {
              return 'vendor-react';
            }

            if (
              id.includes('node_modules/socket.io-client') ||
              id.includes('node_modules/engine.io-client')
            ) {
              return 'vendor-socket';
            }

            if (
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')
            ) {
              return 'vendor-ui';
            }

            if (
              id.includes('node_modules/zod') ||
              id.includes('node_modules/dompurify')
            ) {
              return 'vendor-utils';
            }

            if (id.includes('node_modules/@google/generative-ai')) {
              return 'vendor-ai';
            }

            if (id.includes('node_modules')) {
              return 'vendor-misc';
            }

            return undefined;
          },

          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || '';
            if (/\.(gif|jpe?g|png|svg|webp|avif)$/i.test(name))
              return 'assets/img/[name]-[hash][extname]';
            if (/\.css$/i.test(name))
              return 'assets/css/[name]-[hash][extname]';
            if (/\.(woff2?|eot|ttf|otf)$/i.test(name))
              return 'assets/fonts/[name]-[hash][extname]';
            return 'assets/[ext]/[name]-[hash][extname]';
          },
        },
      },

      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 2,
        },
        format: { comments: false },
        mangle: { safari10: true },
      },

      chunkSizeWarningLimit: 800,
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
  };
});
