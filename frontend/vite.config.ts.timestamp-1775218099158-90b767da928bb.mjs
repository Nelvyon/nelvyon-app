// vite.config.ts
import { defineConfig } from "file:///workspace/app/frontend/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.15_terser@5.46.1/node_modules/vite/dist/node/index.js";
import react from "file:///workspace/app/frontend/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_vite@5.4.21_@types+node@22.19.15_terser@5.46.1_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { viteSourceLocator } from "file:///workspace/app/frontend/node_modules/.pnpm/@metagptx+vite-plugin-source-locator@0.0.16_rollup@4.60.0_vite@5.4.21_@types+node@22.19.15_terser@5.46.1_/node_modules/@metagptx/vite-plugin-source-locator/dist/index.mjs";
import { atoms } from "file:///workspace/app/frontend/node_modules/.pnpm/@metagptx+web-sdk@0.0.66_@babel+parser@7.29.2_@babel+traverse@7.29.0_@babel+types@7.29._02abe45d7d90f8feaf90276b56749bdb/node_modules/@metagptx/web-sdk/dist/plugins.js";
var __vite_injected_original_dirname = "/workspace/app/frontend";
function escapeHtmlAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
process.env.VITE_APP_TITLE ??= process.env.OVERVIEW_TITLE ?? "shadcnui";
process.env.VITE_APP_DESCRIPTION ??= process.env.OVERVIEW_DESCRIPTION ?? "Atoms Generated Project";
process.env.VITE_APP_TITLE = escapeHtmlAttr(process.env.VITE_APP_TITLE);
process.env.VITE_APP_DESCRIPTION = escapeHtmlAttr(process.env.VITE_APP_DESCRIPTION);
process.env.VITE_APP_LOGO_URL ??= process.env.OVERVIEW_LOGO_URL ?? "https://public-frontend-cos.metadl.com/mgx/img/favicon_atoms.ico";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [
    viteSourceLocator({
      prefix: "mgx"
      // 前缀用于标识源代码位置，不能修改
    }),
    react(),
    atoms()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    host: "0.0.0.0",
    // 监听所有网络接口
    port: parseInt(process.env.VITE_PORT || "3000"),
    proxy: {
      "/api": {
        target: `http://localhost:8000`,
        changeOrigin: true
      }
    },
    watch: { usePolling: true, interval: 600 }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          "react-vendor": ["react", "react-dom"],
          "router-vendor": ["react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-aspect-ratio",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-label",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip"
          ],
          "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
          "utils-vendor": [
            "axios",
            "clsx",
            "tailwind-merge",
            "class-variance-authority",
            "date-fns",
            "lucide-react"
          ],
          "query-vendor": ["@tanstack/react-query"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlL2FwcC9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3dvcmtzcGFjZS9hcHAvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3dvcmtzcGFjZS9hcHAvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB2aXRlU291cmNlTG9jYXRvciB9IGZyb20gJ0BtZXRhZ3B0eC92aXRlLXBsdWdpbi1zb3VyY2UtbG9jYXRvcic7XG5pbXBvcnQgeyBhdG9tcyB9IGZyb20gJ0BtZXRhZ3B0eC93ZWItc2RrL3BsdWdpbnMnO1xuXG5mdW5jdGlvbiBlc2NhcGVIdG1sQXR0cihzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzdHJcbiAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpO1xufVxuXG5wcm9jZXNzLmVudi5WSVRFX0FQUF9USVRMRSA/Pz0gcHJvY2Vzcy5lbnYuT1ZFUlZJRVdfVElUTEUgPz8gJ3NoYWRjbnVpJztcbnByb2Nlc3MuZW52LlZJVEVfQVBQX0RFU0NSSVBUSU9OID8/PSBwcm9jZXNzLmVudi5PVkVSVklFV19ERVNDUklQVElPTiA/PyAnQXRvbXMgR2VuZXJhdGVkIFByb2plY3QnO1xucHJvY2Vzcy5lbnYuVklURV9BUFBfVElUTEUgPSBlc2NhcGVIdG1sQXR0cihwcm9jZXNzLmVudi5WSVRFX0FQUF9USVRMRSk7XG5wcm9jZXNzLmVudi5WSVRFX0FQUF9ERVNDUklQVElPTiA9IGVzY2FwZUh0bWxBdHRyKHByb2Nlc3MuZW52LlZJVEVfQVBQX0RFU0NSSVBUSU9OKTtcbnByb2Nlc3MuZW52LlZJVEVfQVBQX0xPR09fVVJMID8/PSBwcm9jZXNzLmVudi5PVkVSVklFV19MT0dPX1VSTCA/PyAnaHR0cHM6Ly9wdWJsaWMtZnJvbnRlbmQtY29zLm1ldGFkbC5jb20vbWd4L2ltZy9mYXZpY29uX2F0b21zLmljbyc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBwbHVnaW5zOiBbXG4gICAgdml0ZVNvdXJjZUxvY2F0b3Ioe1xuICAgICAgcHJlZml4OiAnbWd4JywgLy8gXHU1MjREXHU3RjAwXHU3NTI4XHU0RThFXHU2ODA3XHU4QkM2XHU2RTkwXHU0RUUzXHU3ODAxXHU0RjREXHU3RjZFXHVGRjBDXHU0RTBEXHU4MEZEXHU0RkVFXHU2NTM5XG4gICAgfSksXG4gICAgcmVhY3QoKSxcbiAgICBhdG9tcygpLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogJzAuMC4wLjAnLCAvLyBcdTc2RDFcdTU0MkNcdTYyNDBcdTY3MDlcdTdGNTFcdTdFRENcdTYzQTVcdTUzRTNcbiAgICBwb3J0OiBwYXJzZUludChwcm9jZXNzLmVudi5WSVRFX1BPUlQgfHwgJzMwMDAnKSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogYGh0dHA6Ly9sb2NhbGhvc3Q6ODAwMGAsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICB3YXRjaDogeyB1c2VQb2xsaW5nOiB0cnVlLCBpbnRlcnZhbDogNjAwIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIFZlbmRvciBjaHVua3NcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAncm91dGVyLXZlbmRvcic6IFsncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICd1aS12ZW5kb3InOiBbXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWFjY29yZGlvbicsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWFsZXJ0LWRpYWxvZycsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWFzcGVjdC1yYXRpbycsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWF2YXRhcicsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWNoZWNrYm94JyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtY29sbGFwc2libGUnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1jb250ZXh0LW1lbnUnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtaG92ZXItY2FyZCcsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWxhYmVsJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtbWVudWJhcicsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LW5hdmlnYXRpb24tbWVudScsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXInLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1wcm9ncmVzcycsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXJhZGlvLWdyb3VwJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2Nyb2xsLWFyZWEnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZXBhcmF0b3InLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zbGlkZXInLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zbG90JyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc3dpdGNoJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdGFicycsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRvYXN0JyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9nZ2xlJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9nZ2xlLWdyb3VwJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcCcsXG4gICAgICAgICAgXSxcbiAgICAgICAgICAnZm9ybS12ZW5kb3InOiBbJ3JlYWN0LWhvb2stZm9ybScsICdAaG9va2Zvcm0vcmVzb2x2ZXJzJywgJ3pvZCddLFxuICAgICAgICAgICd1dGlscy12ZW5kb3InOiBbXG4gICAgICAgICAgICAnYXhpb3MnLFxuICAgICAgICAgICAgJ2Nsc3gnLFxuICAgICAgICAgICAgJ3RhaWx3aW5kLW1lcmdlJyxcbiAgICAgICAgICAgICdjbGFzcy12YXJpYW5jZS1hdXRob3JpdHknLFxuICAgICAgICAgICAgJ2RhdGUtZm5zJyxcbiAgICAgICAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgJ3F1ZXJ5LXZlbmRvcic6IFsnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UCxTQUFTLG9CQUFvQjtBQUNwUixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMseUJBQXlCO0FBQ2xDLFNBQVMsYUFBYTtBQUp0QixJQUFNLG1DQUFtQztBQU16QyxTQUFTLGVBQWUsS0FBcUI7QUFDM0MsU0FBTyxJQUNKLFFBQVEsTUFBTSxPQUFPLEVBQ3JCLFFBQVEsTUFBTSxNQUFNLEVBQ3BCLFFBQVEsTUFBTSxNQUFNLEVBQ3BCLFFBQVEsTUFBTSxRQUFRLEVBQ3RCLFFBQVEsTUFBTSxPQUFPO0FBQzFCO0FBRUEsUUFBUSxJQUFJLG1CQUFtQixRQUFRLElBQUksa0JBQWtCO0FBQzdELFFBQVEsSUFBSSx5QkFBeUIsUUFBUSxJQUFJLHdCQUF3QjtBQUN6RSxRQUFRLElBQUksaUJBQWlCLGVBQWUsUUFBUSxJQUFJLGNBQWM7QUFDdEUsUUFBUSxJQUFJLHVCQUF1QixlQUFlLFFBQVEsSUFBSSxvQkFBb0I7QUFDbEYsUUFBUSxJQUFJLHNCQUFzQixRQUFRLElBQUkscUJBQXFCO0FBR25FLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsU0FBUztBQUFBLElBQ1Asa0JBQWtCO0FBQUEsTUFDaEIsUUFBUTtBQUFBO0FBQUEsSUFDVixDQUFDO0FBQUEsSUFDRCxNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFDTixNQUFNLFNBQVMsUUFBUSxJQUFJLGFBQWEsTUFBTTtBQUFBLElBQzlDLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU8sRUFBRSxZQUFZLE1BQU0sVUFBVSxJQUFJO0FBQUEsRUFDM0M7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQTtBQUFBLFVBRVosZ0JBQWdCLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDckMsaUJBQWlCLENBQUMsa0JBQWtCO0FBQUEsVUFDcEMsYUFBYTtBQUFBLFlBQ1g7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQSxVQUNBLGVBQWUsQ0FBQyxtQkFBbUIsdUJBQXVCLEtBQUs7QUFBQSxVQUMvRCxnQkFBZ0I7QUFBQSxZQUNkO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUEsVUFDQSxnQkFBZ0IsQ0FBQyx1QkFBdUI7QUFBQSxRQUMxQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxFQUN6QjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
