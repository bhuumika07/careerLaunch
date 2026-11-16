// scripts/alias-hook.js
import { pathToFileURL, fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    // server-only resolves to empty module in server environments
    return {
      url: pathToFileURL(path.resolve(process.cwd(), "node_modules/server-only/empty.js")).href,
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("next/")) {
    const subpath = specifier.substring(5);
    const candidatePath = path.resolve(process.cwd(), "node_modules/next", subpath + ".js");
    if (fs.existsSync(candidatePath)) {
      return {
        url: pathToFileURL(candidatePath).href,
        shortCircuit: true,
      };
    }
  }

  let targetPath = null;

  if (specifier.startsWith("@/")) {
    const rel = specifier.substring(2);
    targetPath = path.resolve(process.cwd(), "src", rel);
  } else if (specifier.startsWith(".") && context.parentURL && context.parentURL.startsWith("file:")) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    targetPath = path.resolve(parentDir, specifier);
  }

  if (targetPath) {
    const candidatePaths = [
      targetPath + ".ts",
      targetPath + ".tsx",
      path.join(targetPath, "index.ts"),
      path.join(targetPath, "route.ts"),
      targetPath,
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return {
          url: pathToFileURL(p).href,
          shortCircuit: true,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}
