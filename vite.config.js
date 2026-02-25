import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), "index.html"),
        mihaiPop: resolve(process.cwd(), "mihai-pop.html"),
        mihaiPopFilm: resolve(process.cwd(), "mihai-pop-film.html"),
        mihaiPopYoutube: resolve(process.cwd(), "mihai-pop-youtube.html"),
      },
    },
  },
});
