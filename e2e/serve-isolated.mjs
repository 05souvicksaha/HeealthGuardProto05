// A separate in-memory test instance protects the user's running development data.
process.env.PORT = "4175";
process.env.DATABASE_MODE = "memory";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5501";
await import("../server/index.mjs");
const { createServer } = await import("vite");
const server = await createServer({
  configLoader: "runner",
  server: { host: "127.0.0.1", port: 5501, strictPort: true, proxy: {
    "/api": "http://127.0.0.1:4175",
    "/socket.io": { target: "http://127.0.0.1:4175", ws: true }
  } }
});
await server.listen();
