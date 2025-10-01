import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    port: 8080,
    host: "127.0.0.1",
    proxy: mode === "development"
      ? {
          "/api": {
            target: "http://127.0.0.1:8000",
            changeOrigin: true,
            secure: false,
            ws: true,
          },
          "/sanctum": {
            target: "http://127.0.0.1:8000",
            changeOrigin: true,
            secure: false,
          },
        }
      : undefined, // في production مش محتاج proxy
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
}));
