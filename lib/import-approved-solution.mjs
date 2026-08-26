import { access, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateSolution } from "./catalog-schema.mjs";

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function importApprovedSolution({
  inputPath,
  catalogDirectory,
  publicDirectory,
  write = false,
  replace = false,
}) {
  if (!inputPath) throw new Error("inputPath is required");
  if (!catalogDirectory) throw new Error("catalogDirectory is required");
  if (!publicDirectory) throw new Error("publicDirectory is required");
  if (replace && !write) throw new Error("--replace requires --write");

  let value;
  try {
    value = JSON.parse(await readFile(inputPath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${inputPath}: invalid JSON`, { cause: error });
    throw error;
  }

  validateSolution(value, inputPath);

  if (value.thumbnail !== null) {
    const thumbnailPath = path.resolve(publicDirectory, `.${value.thumbnail}`);
    if (!(await pathExists(thumbnailPath))) {
      throw new Error(`${inputPath}: thumbnail does not exist: ${value.thumbnail}`);
    }
  }

  const targetPath = path.resolve(catalogDirectory, `${value.slug}.json`);
  const targetExists = await pathExists(targetPath);
  const result = {
    slug: value.slug,
    targetPath,
    targetExists,
    written: false,
    replaced: false,
  };

  if (!write) return result;
  if (targetExists && !replace) {
    throw new Error(`${targetPath}: already exists; review it and pass --replace to overwrite`);
  }

  await mkdir(catalogDirectory, { recursive: true });
  const contents = `${JSON.stringify(value, null, 2)}\n`;

  if (!replace) {
    let handle;
    try {
      handle = await open(targetPath, "wx");
      await handle.writeFile(contents, "utf8");
    } catch (error) {
      if (handle) await rm(targetPath, { force: true });
      throw error;
    } finally {
      await handle?.close();
    }
  } else {
    const temporaryPath = path.join(catalogDirectory, `.${value.slug}.${process.pid}.${Date.now()}.tmp`);
    try {
      await writeFile(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
      await rename(temporaryPath, targetPath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }

  return { ...result, written: true, replaced: targetExists };
}
