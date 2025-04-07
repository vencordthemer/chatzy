import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Import the path module

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output directory relative to the project root (packages/frontend)
    // Needs to point to ../../packages/backend/public
    outDir: path.resolve(__dirname, '../../packages/backend/public'),
    emptyOutDir: true, // Ensure the output directory is emptied before build
  }
})
