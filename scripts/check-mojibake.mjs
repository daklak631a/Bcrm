import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const roots = ["app", "components", "hooks", "lib", "providers", "store", "types"]
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json"])
const mojibakePattern = /(Ã.|Ä.|áº.|á».)/
const ignoredDirs = new Set(["node_modules", ".next", "scratch", "gas-frontend", ".git"])

function extensionOf(filePath) {
  const index = filePath.lastIndexOf(".")
  return index >= 0 ? filePath.slice(index) : ""
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      walk(fullPath, files)
    } else if (extensions.has(extensionOf(fullPath))) {
      files.push(fullPath)
    }
  }
  return files
}

const offenders = []

for (const root of roots) {
  for (const filePath of walk(root)) {
    const content = readFileSync(filePath, "utf8")
    const lines = content.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (mojibakePattern.test(line)) {
        offenders.push(`${filePath}:${index + 1}`)
      }
    })
  }
}

if (offenders.length > 0) {
  console.error("Phát hiện dấu hiệu mojibake trong file UTF-8:")
  for (const item of offenders.slice(0, 50)) console.error(`- ${item}`)
  if (offenders.length > 50) console.error(`... và ${offenders.length - 50} dòng khác`)
  process.exit(1)
}

console.log("Không phát hiện mojibake trong source chính.")
