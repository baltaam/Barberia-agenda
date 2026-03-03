import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Esto asegura que las rutas de los estilos siempre empiecen desde la raíz
})
