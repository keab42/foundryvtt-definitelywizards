import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const errors = [];

function error(msg) {
    errors.push(msg);
}

// 1. Validate system.json
const systemPath = path.join(rootDir, "system.json");
if (!fs.existsSync(systemPath)) {
    error("Missing system.json");
} else {
    const system = JSON.parse(fs.readFileSync(systemPath, "utf8"));
    if (system.compatibility?.verified !== "14") {
        error(
            `system.json compatibility.verified must be "14" (found "${system.compatibility?.verified}")`,
        );
    }
    if (!system.documentTypes?.Actor?.character) {
        error("system.json must define documentTypes.Actor.character");
    }
    if (
        !system.documentTypes?.Item?.Prop ||
        !system.documentTypes?.Item?.Spell ||
        !system.documentTypes?.Item?.MiscItem
    ) {
        error("system.json must define documentTypes.Item.{Prop,Spell,MiscItem}");
    }
    if (fs.existsSync(path.join(rootDir, "template.json"))) {
        error("Deprecated template.json still exists on disk; use TypeDataModel + documentTypes");
    }
    for (const mod of system.esmodules ?? []) {
        if (!fs.existsSync(path.join(rootDir, mod))) {
            error(`system.json esmodule missing on disk: ${mod}`);
        }
    }
    for (const style of system.styles ?? []) {
        const stylePath = typeof style === "string" ? style : style.path;
        if (!fs.existsSync(path.join(rootDir, stylePath))) {
            error(`system.json style missing on disk: ${stylePath}`);
        }
    }
    for (const lang of system.languages ?? []) {
        if (!fs.existsSync(path.join(rootDir, lang.path))) {
            error(`system.json language file missing on disk: ${lang.path}`);
        }
    }
    for (const pack of system.packs ?? []) {
        if (!fs.existsSync(path.join(rootDir, pack.path))) {
            error(`system.json pack path missing on disk: ${pack.path}`);
        }
    }
}

// 2. Validate lang/en.json & cross-check template/JS localization keys
const langPath = path.join(rootDir, "lang/en.json");
const langData = fs.existsSync(langPath) ? JSON.parse(fs.readFileSync(langPath, "utf8")) : {};

function collectFiles(dir, exts) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectFiles(fullPath, exts));
        } else if (exts.some((ext) => entry.name.endsWith(ext))) {
            results.push(fullPath);
        }
    }
    return results;
}

const templateFiles = collectFiles(path.join(rootDir, "templates"), [".html", ".hbs"]);
for (const tplPath of templateFiles) {
    const rel = path.relative(rootDir, tplPath);
    const content = fs.readFileSync(tplPath, "utf8");

    // Check for <form> tags in sheet templates (DocumentSheetV2 already uses tag: "form")
    if (/<form\b/i.test(content)) {
        error(`${rel}: contains <form> tag (DocumentSheetV2 root is already a <form>)`);
    }

    // Check for deprecated {{editor}} helper or unknown {{formatHTMLMessage}}
    if (/\{\{\s*editor\b/.test(content)) {
        error(`${rel}: uses deprecated {{editor}} helper; use <prose-mirror> instead`);
    }
    if (/\{\{\s*formatHTMLMessage\b/.test(content)) {
        error(`${rel}: uses undefined {{formatHTMLMessage}} helper; use {{{...}}} instead`);
    }

    // Check for unquoted localize calls like {{localize DW.Foo}}
    const unquotedLocalize = content.matchAll(/\{\{\s*localize\s+([A-Za-z0-9_.-]+)\s*\}\}/g);
    for (const match of unquotedLocalize) {
        error(`${rel}: unquoted localize key "${match[1]}" in "${match[0]}"`);
    }

    // Check that all quoted localize keys exist in lang/en.json
    const quotedLocalize = content.matchAll(/\{\{\s*localize\s+['"]([^'"]+)['"]\s*\}\}/g);
    for (const match of quotedLocalize) {
        const key = match[1];
        if (!(key in langData)) {
            error(`${rel}: localize key "${key}" is missing from lang/en.json`);
        }
    }

    // Check balanced Handlebars block tags (#if, #each, #unless)
    for (const block of ["if", "each", "unless"]) {
        const opens = [...content.matchAll(new RegExp(`\\{\\{#${block}\\b`, "g"))].length;
        const closes = [...content.matchAll(new RegExp(`\\{\\{/${block}\\}\\}`, "g"))].length;
        if (opens !== closes) {
            error(`${rel}: unbalanced {{#${block}}} (${opens}) vs {{/${block}}} (${closes})`);
        }
    }
}

// 3. Check module/*.js for banned legacy patterns and missing DW.* localization keys
const jsFiles = collectFiles(path.join(rootDir, "module"), [".js", ".mjs"]);
for (const jsPath of jsFiles) {
    const rel = path.relative(rootDir, jsPath);
    const content = fs.readFileSync(jsPath, "utf8");

    if (/\bgame\.data\b/.test(content)) {
        error(`${rel}: uses removed "game.data" property`);
    }
    if (/\bRollTable\.collection\.entities\b/.test(content)) {
        error(`${rel}: uses removed "RollTable.collection.entities"`);
    }

    const dwKeys = content.matchAll(/['"](DW\.[A-Za-z0-9_.-]+)['"]/g);
    for (const match of dwKeys) {
        const key = match[1];
        if (!(key in langData)) {
            error(`${rel}: localization key "${key}" is missing from lang/en.json`);
        }
    }
}

// 4. Validate RollTable JSON files for Foundry v14 BaseTableResult schema
const rollTableFiles = collectFiles(path.join(rootDir, "resources/roll-tables"), [".json"]);
for (const rtPath of rollTableFiles) {
    const rel = path.relative(rootDir, rtPath);
    const table = JSON.parse(fs.readFileSync(rtPath, "utf8"));
    for (const [idx, result] of (table.results ?? []).entries()) {
        if (typeof result.type !== "string") {
            error(
                `${rel} result[${idx}]: "type" must be a v14 string (e.g. "text"), found ${JSON.stringify(result.type)}`,
            );
        }
        if ("text" in result) {
            error(
                `${rel} result[${idx}]: uses legacy "text" property instead of v14 "name"/"description"`,
            );
        }
        if ("documentCollection" in result || "documentId" in result) {
            error(
                `${rel} result[${idx}]: uses legacy "documentCollection"/"documentId" instead of "documentUuid"`,
            );
        }
        if (typeof result.name !== "string" && typeof result.description !== "string") {
            error(`${rel} result[${idx}]: must define "name" or "description"`);
        }
    }
}

// 5. Ensure no legacy .less or v10 .db files remain
const lessFiles = collectFiles(path.join(rootDir, "styles"), [".less"]);
if (lessFiles.length > 0) {
    error(
        `Legacy .less files still present: ${lessFiles.map((f) => path.relative(rootDir, f)).join(", ")}`,
    );
}
const dbFiles = collectFiles(path.join(rootDir, "packs"), [".db"]);
if (dbFiles.length > 0) {
    error(
        `Legacy v10 NeDB .db files still present: ${dbFiles.map((f) => path.relative(rootDir, f)).join(", ")}`,
    );
}

if (errors.length > 0) {
    console.error(`Foundry v14 static check failed with ${errors.length} error(s):`);
    for (const err of errors) {
        console.error(`  - ${err}`);
    }
    process.exit(1);
} else {
    console.log("Foundry v14 static check passed!");
}
