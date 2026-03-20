import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { Schema, ValidateEnv } from "@julr/vite-plugin-validate-env";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      vue(),
      tailwindcss(),
      ValidateEnv({
        validator: "builtin",
        schema: {
          VITE_REGISTRY_URL: Schema.string.optional(),
        },
      }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      proxy: {
        "/v2": {
          target: env.VITE_REGISTRY_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
