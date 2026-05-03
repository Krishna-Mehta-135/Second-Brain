import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// In CommonJS, __dirname is globally available.

// Search for .env in potential locations relative to this file
const potentialPaths = [
  path.join(__dirname, "../../.env"), // root if in apps/http-backend/src
  path.join(__dirname, "../../../.env"), // alternative
  path.join(process.cwd(), ".env"), // current working directory
  path.join(process.cwd(), "../../.env"), // root if CWD is apps/http-backend
];

let loaded = false;
for (const envPath of potentialPaths) {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`[Env] Successfully loaded .env from ${envPath}`);
      loaded = true;
      break;
    }
  }
}

if (!loaded) {
  console.warn(
    `[Env] Warning: No .env file found in searched locations. Using existing environment variables.`,
  );
}
