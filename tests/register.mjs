/** Installs the resolution hooks before the test files load. */
import { register } from "node:module";

register("./resolve-hooks.mjs", import.meta.url);
