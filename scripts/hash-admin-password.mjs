import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];

if (!password || password.length < 12) {
  console.error("Usage: npm run admin:hash -- \"at-least-12-chars-password\"");
  process.exit(1);
}

const iterations = 600000;
const salt = randomBytes(16).toString("base64url");
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
const sessionSecret = randomBytes(48).toString("base64url");

console.log(`ADMIN_PASSWORD_HASH=pbkdf2_sha256:${iterations}:${salt}:${hash}`);
console.log(`ADMIN_SESSION_SECRET=${sessionSecret}`);
