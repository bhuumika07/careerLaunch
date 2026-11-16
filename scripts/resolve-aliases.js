// scripts/resolve-aliases.js
import { register } from "node:module";

register("./alias-hook.js", import.meta.url);
