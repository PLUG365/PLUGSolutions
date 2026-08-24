import { rm } from "node:fs/promises";
import path from "node:path";

const outputRoot = path.resolve(process.cwd(), "out");
const validationRoute = path.resolve(outputRoot, "solutions", "__build-validation__");

if (!validationRoute.startsWith(`${outputRoot}${path.sep}`)) {
  throw new Error("Refusing to clean a path outside the static export directory");
}

await rm(validationRoute, { recursive: true, force: true });
console.log("Removed the build-only dynamic route validation artifact.");
