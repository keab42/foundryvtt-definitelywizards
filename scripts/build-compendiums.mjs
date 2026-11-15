import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

/**
 * Resolve the Foundry VTT installation path from CLI args, FOUNDRY_APP_DIR, or the local default.
 * @param {string[]} argv
 * @returns {string}
 */
function resolveFoundryDir(argv) {
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--foundry-dir") {
            const value = argv[i + 1];
            if (!value || value.startsWith("--")) {
                throw new Error("Missing path after --foundry-dir.");
            }
            return value;
        }
        if (arg.startsWith("--foundry-dir=")) {
            const value = arg.slice("--foundry-dir=".length);
            if (!value) {
                throw new Error("Missing path after --foundry-dir=.");
            }
            return value;
        }
    }
    return process.env.FOUNDRY_APP_DIR || "/home/sheas/.local/share/foundryvtt-app";
}

const foundryDirInput = path.resolve(resolveFoundryDir(process.argv.slice(2)));
const foundryPackagePath =
    path.basename(foundryDirInput) === "package.json"
        ? foundryDirInput
        : path.join(foundryDirInput, "package.json");
if (!fs.existsSync(foundryPackagePath)) {
    throw new Error(
        `Foundry VTT installation not found at ${foundryPackagePath}; set FOUNDRY_APP_DIR or pass --foundry-dir <path> to load classic-level.`,
    );
}

const systemManifest = JSON.parse(fs.readFileSync(path.join(rootDir, "system.json"), "utf8"));
const systemId = systemManifest.id;
const systemVersion = systemManifest.version;
const coreVersion = systemManifest.compatibility?.verified;
if (!systemId || !systemVersion || !coreVersion) {
    throw new Error("system.json must define id, version, and compatibility.verified.");
}

const require = createRequire(foundryPackagePath);
const { ClassicLevel } = require("classic-level");

const NOW = Date.now();
const BASE_STATS = {
    compendiumSource: null,
    duplicateSource: null,
    exportSource: null,
    coreVersion,
    systemId,
    systemVersion,
    createdTime: NOW,
    modifiedTime: NOW,
    lastModifiedBy: null,
};

const EXAM_MACRO = {
    _id: "dwExamGenMacro01",
    name: "Generate Practical Exam",
    type: "script",
    author: null,
    img: "icons/svg/dice-target.svg",
    scope: "global",
    command: [
        "if (!game.user.isGM) {",
        '    ui.notifications.warn(game.i18n?.localize("DW.ExamGMOnlyWarning") || "Only the GM can generate a Practical Exam.");',
        "} else {",
        "    await game.definitelyWizards?.generatePracticalExam();",
        "}",
    ].join("\n"),
    folder: null,
    sort: 100000,
    ownership: { default: 0 },
    flags: {},
    _stats: { ...BASE_STATS },
};

function verifyPackManifest(packDir) {
    const manifestName = fs.readFileSync(path.join(packDir, "CURRENT"), "utf8").trim();
    if (!/^MANIFEST-\d+$/.test(manifestName) || !fs.existsSync(path.join(packDir, manifestName))) {
        throw new Error(`Invalid CURRENT manifest in ${packDir}: ${manifestName}`);
    }
}

async function buildMacrosPack() {
    const packDir = path.join(rootDir, "packs/definitely-wizards-macros");
    fs.rmSync(packDir, { recursive: true, force: true });
    fs.mkdirSync(packDir, { recursive: true });

    const db = new ClassicLevel(packDir, {
        keyEncoding: "utf8",
        valueEncoding: "json",
        createIfMissing: true,
    });
    await db.open();

    const macrosSub = db.sublevel("macros", { keyEncoding: "utf8", valueEncoding: "json" });
    let keys;
    try {
        await macrosSub.put(EXAM_MACRO._id, EXAM_MACRO);
        keys = await db.keys().all();
    } finally {
        await db.close();
    }

    const invalidKeys = keys.filter((key) => !key.startsWith("!macros!"));
    if (keys.length === 0 || invalidKeys.length > 0) {
        throw new Error(
            `Unexpected keys in definitely-wizards-macros: ${JSON.stringify(invalidKeys)}`,
        );
    }
    verifyPackManifest(packDir);
    console.log(`Built definitely-wizards-macros (${keys.length} LevelDB keys).`);
}

await buildMacrosPack();
