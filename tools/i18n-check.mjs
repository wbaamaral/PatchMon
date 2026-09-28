#!/usr/bin/env node
/**
 * i18n-check.mjs — verifies translation catalog parity between locales.
 *
 * For every namespace file in locales/en/, checks that the matching file
 * in each target locale has:
 *   - the exact same set of keys
 *   - identical interpolation placeholders per key
 *   - no empty strings
 *
 * Usage: node tools/i18n-check.mjs
 * Exits 1 on any mismatch.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "..", "frontend", "src", "i18n", "locales");
const BASE_LOCALE = "en";

function flattenKeys(obj, prefix = "") {
	const keys = new Map();
	for (const [k, v] of Object.entries(obj)) {
		const full = prefix ? `${prefix}.${k}` : k;
		if (typeof v === "object" && v !== null) {
			for (const [ck, cv] of flattenKeys(v, full)) {
				keys.set(ck, cv);
			}
		} else {
			keys.set(full, v);
		}
	}
	return keys;
}

function extractPlaceholders(str) {
	const matches = str.match(/\{\{(\w+)\}\}/g) || [];
	return [...new Set(matches)].sort();
}

function loadCatalog(locale, file) {
	const path = join(LOCALES_DIR, locale, file);
	if (!existsSync(path)) return null;
	return JSON.parse(readFileSync(path, "utf-8"));
}

function main() {
	if (!existsSync(LOCALES_DIR)) {
		console.error(`Locales directory not found: ${LOCALES_DIR}`);
		process.exit(1);
	}

	const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name);

	if (!locales.includes(BASE_LOCALE)) {
		console.error(`Base locale "${BASE_LOCALE}" not found in ${LOCALES_DIR}`);
		process.exit(1);
	}

	const targetLocales = locales.filter((l) => l !== BASE_LOCALE);
	if (targetLocales.length === 0) {
		console.log("No target locales to check.");
		return;
	}

	const baseFiles = readdirSync(join(LOCALES_DIR, BASE_LOCALE)).filter((f) =>
		f.endsWith(".json"),
	);

	let errors = 0;

	for (const file of baseFiles) {
		const baseCatalog = loadCatalog(BASE_LOCALE, file);
		if (!baseCatalog) continue;
		const baseKeys = flattenKeys(baseCatalog);

		for (const locale of targetLocales) {
			const targetCatalog = loadCatalog(locale, file);
			if (!targetCatalog) {
				console.error(`MISSING FILE: ${locale}/${file}`);
				errors++;
				continue;
			}
			const targetKeys = flattenKeys(targetCatalog);

			// Missing keys
			for (const [key, baseVal] of baseKeys) {
				if (!targetKeys.has(key)) {
					console.error(`MISSING KEY: ${locale}/${file} → "${key}"`);
					errors++;
					continue;
				}
				const targetVal = targetKeys.get(key);

				// Empty strings
				if (typeof targetVal === "string" && targetVal.trim() === "") {
					console.error(`EMPTY STRING: ${locale}/${file} → "${key}"`);
					errors++;
				}

				// Placeholder parity
				const basePlaceholders = extractPlaceholders(String(baseVal));
				const targetPlaceholders = extractPlaceholders(String(targetVal));
				if (basePlaceholders.join(",") !== targetPlaceholders.join(",")) {
					console.error(
						`PLACEHOLDER MISMATCH: ${locale}/${file} → "${key}"  en=[${basePlaceholders}] ${locale}=[${targetPlaceholders}]`,
					);
					errors++;
				}
			}

			// Extra keys
			for (const key of targetKeys.keys()) {
				if (!baseKeys.has(key)) {
					console.error(`EXTRA KEY: ${locale}/${file} → "${key}"`);
					errors++;
				}
			}
		}
	}

	if (errors > 0) {
		console.error(`\ni18n-check FAILED: ${errors} error(s) found.`);
		process.exit(1);
	}
	console.log(
		`i18n-check PASSED: ${baseFiles.length} file(s) × ${targetLocales.length} locale(s) — all keys match.`,
	);
}

main();
