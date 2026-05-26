import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("MongoDB Atlas connected");
  } catch (err) {
    if (err?.code === "ECONNREFUSED" && String(err?.syscall) === "querySrv") {
      throw new Error(
        "MongoDB Atlas SRV DNS failed on this machine. In backend/.env use the Atlas " +
          '"Standard connection string" (mongodb://… with shard hosts), not mongodb+srv://.'
      );
    }
    throw err;
  }
}
