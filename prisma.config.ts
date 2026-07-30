import path from "node:path";
import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
});
