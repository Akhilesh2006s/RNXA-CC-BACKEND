import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const emptyToUndefined = (v) => (v === "" || v === undefined ? undefined : v);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, "JWT_ACCESS_SECRET is required (min 16 chars)")
    .refine((s) => process.env.NODE_ENV !== "production" || s.length >= 32, {
      message: "JWT_ACCESS_SECRET must be at least 32 characters when NODE_ENV=production"
    }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET is required (min 16 chars)")
    .refine((s) => process.env.NODE_ENV !== "production" || s.length >= 32, {
      message: "JWT_REFRESH_SECRET must be at least 32 characters when NODE_ENV=production"
    }),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
  CLIENT_ORIGIN_SUFFIXES: z.preprocess(emptyToUndefined, z.string().optional()).default(""),
  R2_ACCOUNT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_BUCKET_NAME: z.preprocess(emptyToUndefined, z.string().optional()),
  R2_PUBLIC_BASE_URL: z.preprocess(emptyToUndefined, z.string().optional())
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("=== Invalid environment configuration (fix in Railway Variables) ===");
  for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${key}: ${(messages ?? []).join(", ")}`);
  }
  console.error("Required: NODE_ENV, PORT, MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CLIENT_ORIGIN");
  process.exit(1);
}

export const env = parsed.data;

export const clientOrigins = env.CLIENT_ORIGIN.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const clientOriginSuffixes = (env.CLIENT_ORIGIN_SUFFIXES ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isOriginAllowed(origin) {
  if (!origin) return true;
  if (clientOrigins.includes(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    const host = hostname.toLowerCase();
    if (protocol !== "https:" && protocol !== "http:") return false;
    for (const suffix of clientOriginSuffixes) {
      const s = suffix.toLowerCase();
      if (!s) continue;
      if (host === s || host.endsWith(`.${s}`)) return true;
    }

    const strictOnly = /^true$/i.test(process.env.CLIENT_ORIGIN_STRICT ?? "");
    if (!strictOnly && protocol === "https:" && host.endsWith(".vercel.app")) {
      return true;
    }
  } catch {
    /* invalid URL */
  }
  return false;
}
