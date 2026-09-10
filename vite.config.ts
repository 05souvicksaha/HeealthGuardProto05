import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5500,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:4174",
      "/socket.io": { target: "http://127.0.0.1:4174", ws: true }
    }
  },
  preview: {
    port: 5500,
    strictPort: true,
    host: "127.0.0.1"
  }
});
