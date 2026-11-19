import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

interface TablerIcon {
  name: string;
  category: string;
  tags: (string | number)[];
  styles: { outline?: object };
}

const iconIndexId = "virtual:icon-index";

function tablerFile(name: string): unknown {
  const file = createRequire(import.meta.url).resolve(`@tabler/icons/${name}`);
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Every outline icon's name and search words, trimmed from Tabler's 2 MB metadata (decision 0019). */
function iconIndex(): Plugin {
  return {
    name: "icon-index",
    resolveId: (id) => (id === iconIndexId ? `\0${iconIndexId}` : undefined),
    load(id) {
      if (id !== `\0${iconIndexId}`) return undefined;
      const icons = Object.values(tablerFile("icons.json") as Record<string, TablerIcon>);
      const outline = icons
        .filter((icon) => icon.styles.outline)
        .map((icon) => [icon.name, [icon.category, ...icon.tags].join(" ").toLowerCase()]);
      return `export default ${JSON.stringify(outline)};`;
    },
  };
}

/** Each outline icon's drawing as its own file, /icons/{name}.json, fetched when shown (decision 0019). */
function iconDrawings(): Plugin {
  const drawings = () => tablerFile("tabler-nodes-outline.json") as Record<string, unknown>;
  return {
    name: "icon-drawings",
    configureServer(server) {
      const all = drawings();
      server.middlewares.use("/icons", (request, response, next) => {
        const name = /^\/([a-z0-9-]+)\.json$/.exec(request.url ?? "")?.[1];
        if (!name || !(name in all)) return next();
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(all[name]));
      });
    },
    generateBundle() {
      for (const [name, drawing] of Object.entries(drawings())) {
        this.emitFile({
          type: "asset",
          fileName: `icons/${name}.json`,
          source: JSON.stringify(drawing),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), iconIndex(), iconDrawings()],
  resolve: {
    alias: { "@": "/src" },
  },
  server: {
    proxy: { "/api": "http://localhost:8000", "/mcp": "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/lib/testing/setup.ts"],
    restoreMocks: true,
  },
});
