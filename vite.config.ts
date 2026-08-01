import { defineConfig } from "vite";

const USER_AGENT = "NekosApiCheck (https://github.com/giripratik/nekos-api-check)";

export default defineConfig({
  server: {
    proxy: {
      "/api/nekos-best": {
        target: "https://nekos.best",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nekos-best/, "/api/v2"),
        headers: { "User-Agent": USER_AGENT },
      },
      "/api/nekosapi": {
        target: "https://api.nekosapi.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nekosapi/, "/v4"),
        headers: { "User-Agent": USER_AGENT },
      },
    },
  },
});
