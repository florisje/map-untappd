import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext', // required for top-level await in main.ts
  },
  server: {
    open: true,
  },
})
