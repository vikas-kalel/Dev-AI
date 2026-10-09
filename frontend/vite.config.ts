import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // SSE streaming endpoints — must not buffer, flush immediately
        "/api/v1/conversations": {
          target: "http://localhost:5000",
          changeOrigin: true,
          // Disable response buffering so SSE chunks reach the browser immediately
          configure: (proxy) => {
            proxy.on("proxyReq", (_proxyReq, _req, res) => {
              // Tell the proxy not to buffer — flush headers immediately
              (res as any).flushHeaders?.();
            });
          },
        },
        // All other /api routes
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };
});
