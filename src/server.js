import { connectDb } from "./config/db.js";
import { clientOriginSuffixes, clientOrigins, env } from "./config/env.js";
import { app } from "./app.js";

const HOST = "0.0.0.0";

async function connectWithRetry(attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await connectDb();
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[mongodb] attempt ${i}/${attempts} failed: ${msg}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function bootstrap() {
  const server = app.listen(env.PORT, HOST, () => {
    console.log(
      `RNXA API listening on ${HOST}:${env.PORT} (${env.NODE_ENV}) — CORS origins: ${clientOrigins.length}`
    );
  });

  server.on("error", (err) => {
    console.error("HTTP server error", err);
    process.exit(1);
  });

  try {
    await connectWithRetry();
  } catch (err) {
    console.error("Failed to connect MongoDB — check MONGO_URI and Atlas Network Access (allow 0.0.0.0/0)", err);
    server.close();
    process.exit(1);
  }

  if (env.NODE_ENV === "production" && !clientOriginSuffixes.length) {
    console.warn(
      "[cors] CLIENT_ORIGIN_SUFFIXES is empty — add your Vercel team suffix (e.g. team-name.vercel.app) or list every preview URL in CLIENT_ORIGIN."
    );
  }
}

bootstrap().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});
