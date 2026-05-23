#!/usr/bin/env node
/**
 * pnpm v11 のビルドスクリプト承認チェックを回避して
 * electron-builder を直接呼び出すラッパー。
 * Usage: node scripts/build.js [mac|win|linux]
 */
const { build } = require("electron-builder");
const fs = require("node:fs");
const path = require("node:path");

// package.json のリビジョン (patch) をインクリメント
const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);
pkg.version = `${major}.${minor}.${patch + 1}`;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log(`version: ${major}.${minor}.${patch} → ${pkg.version}`);

const target = process.argv[2];
const config = {};
if (target === "mac")   config.mac   = [];
if (target === "win")   config.win   = [];
if (target === "linux") config.linux = [];

build(config).catch((err) => {
	console.error(err);
	process.exit(1);
});
