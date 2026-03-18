import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { Schema, ValidateEnv } from '@julr/vite-plugin-validate-env'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    ValidateEnv({
      validator: 'builtin',
      schema: {
        VITE_REGISTRY_URL: Schema.string(),
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
