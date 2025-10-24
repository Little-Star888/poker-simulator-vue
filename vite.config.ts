import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      proxy: {
        "/poker": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    build: {
      // 生产环境配置
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    define: {
      // 根据环境定义不同的API基础URL
      __API_BASE_URL__: JSON.stringify(
        mode === "production"
          ? "http://bread.yjtsh.site:9080"
          : "http://localhost:8080",
      ),
    },
  };
});
