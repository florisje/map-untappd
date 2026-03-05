import { defineConfig } from 'vite'

export default defineConfig({
  base: '/map-untappd/',
  build: {
    target: 'esnext', // required for top-level await in main.ts
  },
  server: {
    open: true,
  },
})
