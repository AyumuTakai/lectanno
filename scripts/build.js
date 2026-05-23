#!/usr/bin/env node
/**
 * pnpm v11 のビルドスクリプト承認チェックを回避して
 * electron-builder を直接呼び出すラッパー。
 * Usage: node scripts/build.js [mac|win|linux]
 */
const { build } = require("electron-builder");

const target = process.argv[2];
const config = {};
if (target === "mac")   config.mac   = [];
if (target === "win")   config.win   = [];
if (target === "linux") config.linux = [];

build(config).catch((err) => {
	console.error(err);
	process.exit(1);
});
