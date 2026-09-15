import { cp, mkdir, rm } from "node:fs/promises";

const standaloneDirectory = ".next/standalone";
const standaloneNextDirectory = `${standaloneDirectory}/.next`;

await rm(`${standaloneDirectory}/public`, { force: true, recursive: true });
await rm(`${standaloneNextDirectory}/static`, { force: true, recursive: true });

await mkdir(standaloneNextDirectory, { recursive: true });
await cp("public", `${standaloneDirectory}/public`, { recursive: true });
await cp(".next/static", `${standaloneNextDirectory}/static`, {
  recursive: true,
});
