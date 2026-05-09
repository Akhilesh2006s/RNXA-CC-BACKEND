import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { app } from "./app.js";

async function bootstrap() {
  await connectDb();
  app.listen(env.PORT, () => {
    console.log(`FounderOS API (Node.js) listening on port ${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});
