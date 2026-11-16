import * as Dice from "./dice.js";

export const STAT_MACRO_TYPE = "DefinitelyWizardsStatRoll";

const DARK_SHEET_ICON_PATHS = new Set([
    "systems/definitely-wizards/resources/icons/magic-wand.svg",
    "systems/definitely-wizards/resources/icons/wizard-hat.svg",
    "systems/definitely-wizards/resources/icons/misc-item.svg",
    "icons/svg/mystery-man.svg",
    "icons/svg/item-bag.svg",
]);

const MACRO_ICON_PATHS = {
    spell: "systems/definitely-wizards/resources/icons/macro-spell.svg",
    prop: "systems/definitely-wizards/resources/icons/macro-prop.svg",
    miscItem: "systems/definitely-wizards/resources/icons/macro-item.svg",
};

const DEFAULT_PLAYER_STAT_KEYS = ["wizard:1d6", "wizard:2d6kl", "wild:1d6", "wild:2d6kl"];

const SHIFT_CLICK_WINDOW_MS = 300;
let shiftListenerRegistered = false;
let lastPointerShift = false;
let lastPointerShiftTimestamp = 0;

/**
 * Track the Shift modifier on capture pointer/click events because Foundry's Hotbar
 * invokes Macro#execute() without forwarding the PointerEvent and focus changes can clear
 * KeyboardManager.downKeys.
 */
export function initMacroListeners() {
    if (shiftListenerRegistered || typeof globalThis.window?.addEventListener !== "function") {
        return;
    }
    shiftListenerRegistered = true;

    const recordPointerShift = (/** @type {MouseEvent | PointerEvent} */ event) => {
        if (event.shiftKey) {
            lastPointerShift = true;
            lastPointerShiftTimestamp = Date.now();
        } else {
            lastPointerShift = false;
            lastPointerShiftTimestamp = 0;
        }
    };

    globalThis.window.addEventListener("pointerdown", recordPointerShift, { capture: true });
    globalThis.window.addEventListener("click", recordPointerShift, { capture: true });
}

/**
 * Synchronously check whether Wit Bonus was requested via explicit option or Shift-click
 * before any async lookups/dialogs run.
 * @param {boolean | undefined} explicitWitBonus
 * @returns {boolean}
 */
function consumeWitShift(explicitWitBonus) {
    if (typeof explicitWitBonus === "boolean") {
        return explicitWitBonus;
    }

    const activeEvent = globalThis.window?.event;
    const activeEventShift = Boolean(
        activeEvent && "shiftKey" in activeEvent && activeEvent.shiftKey,
    );
    const recentPointerShift =
        lastPointerShift && Date.now() - lastPointerShiftTimestamp <= SHIFT_CLICK_WINDOW_MS;
    const keyboardShift = Boolean(game.keyboard?.isModifierActive("SHIFT"));

    lastPointerShift = false;
    lastPointerShiftTimestamp = 0;
    return activeEventShift || recentPointerShift || keyboardShift;
}

const STAT_MACRO_CONFIGS = {
    "wizard:1d6": {
        isWizardRoll: true,
        formula: "1d6",
        nameKey: "DW.MacroWizard1d6Name",
        img: "systems/definitely-wizards/resources/icons/macro-wizard-1d6.svg",
    },
    "wizard:2d6kl": {
        isWizardRoll: true,
        formula: "2d6kl",
        nameKey: "DW.MacroWizardWitName",
        img: "systems/definitely-wizards/resources/icons/macro-wizard-wit.svg",
    },
    "wild:1d6": {
        isWizardRoll: false,
        formula: "1d6",
        nameKey: "DW.MacroWild1d6Name",
        img: "systems/definitely-wizards/resources/icons/macro-wild-1d6.svg",
    },
    "wild:2d6kl": {
        isWizardRoll: false,
        formula: "2d6kl",
        nameKey: "DW.MacroWildWitName",
        img: "systems/definitely-wizards/resources/icons/macro-wild-wit.svg",
    },
};

/**
 * Collect unique owned character actors from currently controlled canvas tokens.
 * @returns {DefinitelyWizardsActorLike[]}
 */
function getControlledOwnedCharacters() {
    /** @type {Map<string, DefinitelyWizardsActorLike>} */
    const byUuid = new Map();
    for (const token of canvas?.tokens?.controlled ?? []) {
        const actor = token?.actor;
        if (actor?.type !== "character" || !actor.isOwner) continue;
        if (!byUuid.has(actor.uuid)) {
            byUuid.set(actor.uuid, actor);
        }
    }
    return Array.from(byUuid.values());
}

/**
 * Format an actor option label showing current Wizard and Wild values.
 * @param {DefinitelyWizardsActorLike} actor
 * @returns {string}
 */
function formatMacroActorOption(actor) {
    return game.i18n.format("DW.MacroActorOptionLabel", {
        name: actor.name,
        wizard: actor.system.stats.wizard,
        wild: actor.system.stats.wild,
    });
}

/**
 * Resolve an acting character without prompting when unambiguous (used for unowned item cards).
 * @returns {DefinitelyWizardsActorLike | null}
 */
function resolveUnambiguousActor() {
    const controlled = getControlledOwnedCharacters();
    if (controlled.length === 1) return controlled[0];
    if (controlled.length > 1) return null;

    const assigned = game.user.character;
    if (assigned?.type === "character" && assigned.isOwner) return assigned;

    const { candidates } = Dice.collectOwnedCharacters();
    return candidates.length === 1 ? candidates[0] : null;
}

/**
 * Resolve which owned character executes a generic macro:
 * controlled token(s) -> assigned character -> single owned character -> picker dialog.
 * @returns {Promise<DefinitelyWizardsActorLike | null>}
 */
export async function resolveMacroActor() {
    const controlled = getControlledOwnedCharacters();
    if (controlled.length === 1) {
        return controlled[0];
    }
    if (controlled.length > 1) {
        return Dice.promptActorChoice({
            candidates: controlled,
            title: game.i18n.localize("DW.ChooseMacroActorTitle"),
            prompt: game.i18n.localize("DW.ChooseMacroActorPrompt"),
            confirmLabel: game.i18n.localize("DW.RollButton"),
            formatOption: formatMacroActorOption,
        });
    }

    const assigned = game.user.character;
    if (assigned?.type === "character" && assigned.isOwner) {
        return assigned;
    }

    const { candidates } = Dice.collectOwnedCharacters();
    if (candidates.length === 0) {
        ui.notifications.warn(game.i18n.localize("DW.NoMacroActorWarning"));
        return null;
    }
    if (candidates.length === 1) {
        return candidates[0];
    }

    return Dice.promptActorChoice({
        candidates,
        title: game.i18n.localize("DW.ChooseMacroActorTitle"),
        prompt: game.i18n.localize("DW.ChooseMacroActorPrompt"),
        confirmLabel: game.i18n.localize("DW.RollButton"),
        formatOption: formatMacroActorOption,
    });
}

/**
 * Execute a Wizard or Wild check from a hotbar or compendium macro.
 * @param {object} [options]
 * @param {boolean} [options.isWizardRoll=true]
 * @param {string} [options.formula="1d6"]
 * @param {boolean} [options.witBonus]
 * @returns {Promise<ChatMessage | null | undefined>}
 */
export async function rollStatMacro({ isWizardRoll = true, formula = "1d6", witBonus } = {}) {
    const useWit = formula === "2d6kl" ? true : consumeWitShift(witBonus);
    const normalizedFormula = useWit ? "2d6kl" : "1d6";
    const actor = await resolveMacroActor();
    if (!actor) return null;

    return Dice.rollSkill(actor, {
        isWizardRoll: Boolean(isWizardRoll),
        formula: normalizedFormula,
    });
}

/**
 * Execute a dropped Spell (rolls Wizard 1d6, or Wit Bonus 2d6kl with Shift) or Prop/Item macro.
 * @param {string} itemUuid
 * @param {object} [options]
 * @param {boolean} [options.witBonus]
 * @returns {Promise<ChatMessage | null | undefined>}
 */
export async function rollItemMacro(itemUuid, options = {}) {
    const useWit = consumeWitShift(options.witBonus);
    const item = itemUuid ? await foundry.utils.fromUuid(itemUuid) : null;
    if (item?.documentName !== "Item") {
        ui.notifications.warn(game.i18n.localize("DW.MacroItemMissingWarning"));
        return null;
    }

    const parentActor = item.parent?.documentName === "Actor" ? item.parent : null;
    if (parentActor && !parentActor.isOwner) {
        ui.notifications.warn(game.i18n.localize("DW.MacroNotOwnerWarning"));
        return null;
    }

    if (item.type === "Spell") {
        const actingActor = parentActor ?? (await resolveMacroActor());
        if (!actingActor) return null;

        const formula = useWit ? "2d6kl" : "1d6";
        return Dice.rollSkill(actingActor, { isWizardRoll: true, formula, spell: item });
    }

    const cardActor = parentActor ?? resolveUnambiguousActor();
    return Dice.postItemCard(cardActor, item);
}

/**
 * Choose a hotbar-friendly icon for a dragged Item, swapping dark-on-dark sheet defaults.
 * @param {Item} item
 * @returns {string}
 */
function getMacroImageForItem(item) {
    const img = item.img || "";
    if (!img || img === CONST.DEFAULT_TOKEN || DARK_SHEET_ICON_PATHS.has(img)) {
        if (item.type === "Spell") return MACRO_ICON_PATHS.spell;
        if (item.type === "Prop") return MACRO_ICON_PATHS.prop;
        return MACRO_ICON_PATHS.miscItem;
    }
    return img;
}

/**
 * Build macro metadata for one of the configured Wizard/Wild stat roll macros.
 * @param {keyof typeof STAT_MACRO_CONFIGS} configKey
 * @returns {{ name: string, img: string, command: string, flags: Record<string, any> } | null}
 */
function buildStatMacroData(configKey) {
    const config = STAT_MACRO_CONFIGS[configKey];
    if (!config) return null;

    return {
        name: game.i18n.localize(config.nameKey),
        img: config.img,
        command: `await game.definitelyWizards?.rollStatMacro({ isWizardRoll: ${config.isWizardRoll}, formula: "${config.formula}" });`,
        flags: {
            statRoll: {
                isWizardRoll: config.isWizardRoll,
                formula: config.formula,
                defaultKey: configKey,
            },
        },
    };
}

/**
 * Find an existing owned macro matching the command or create a new one, then assign to hotbar.
 * @param {object} spec
 * @param {string} spec.name
 * @param {string} spec.img
 * @param {string} spec.command
 * @param {Record<string, any>} spec.flags
 * @param {number | string} slot
 * @returns {Promise<Macro | null>}
 */
async function findOrCreateAndAssignMacro({ name, img, command, flags }, slot) {
    let macro = game.macros.find((m) => m.command === command && m.isOwner) ?? null;

    if (!macro) {
        if (!Macro.canUserCreate(game.user) || !game.user.hasPermission("MACRO_SCRIPT")) {
            ui.notifications.warn(game.i18n.localize("DW.MacroCreatePermissionWarning"));
            return null;
        }
        macro =
            (await Macro.create({
                name,
                type: "script",
                img,
                command,
                flags: { "definitely-wizards": flags },
            })) ?? null;
    }

    if (macro) {
        await game.user.assignHotbarMacro(macro, slot);
    }
    return macro;
}

/**
 * Create and assign a hotbar macro for a dragged Wizard or Wild stat roll button.
 * @param {Record<string, any>} data
 * @param {number | string} slot
 */
async function createStatRollMacro(data, slot) {
    const statKey = data.isWizardRoll ? "wizard" : "wild";
    const formulaKey = data.formula === "2d6kl" ? "2d6kl" : "1d6";
    const configKey = /** @type {keyof typeof STAT_MACRO_CONFIGS} */ (`${statKey}:${formulaKey}`);
    const macroData = buildStatMacroData(configKey);
    if (!macroData) return;

    await findOrCreateAndAssignMacro(macroData, slot);
}

/**
 * Ensure the shared World macros for Wizard/Wild 1d6 and Wit Bonus rolls exist and are
 * executable by all players.
 * @returns {Promise<Map<keyof typeof STAT_MACRO_CONFIGS, Macro>>}
 */
async function ensureDefaultPlayerMacros() {
    const desiredOwnership = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    /** @type {Map<keyof typeof STAT_MACRO_CONFIGS, Macro>} */
    const byKey = new Map();
    /** @type {Array<{ configKey: keyof typeof STAT_MACRO_CONFIGS, data: Record<string, any> }>} */
    const toCreate = [];

    for (const key of DEFAULT_PLAYER_STAT_KEYS) {
        const configKey = /** @type {keyof typeof STAT_MACRO_CONFIGS} */ (key);
        const macroData = buildStatMacroData(configKey);
        if (!macroData) continue;

        const existing =
            game.macros.find(
                (m) =>
                    m.type === "script" &&
                    (m.getFlag?.("definitely-wizards", "statRoll")?.defaultKey === configKey ||
                        m.command === macroData.command),
            ) ?? null;

        if (existing) {
            if ((existing.ownership?.default ?? 0) < CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
                await existing.update?.({ ownership: { default: desiredOwnership } });
            }
            byKey.set(configKey, existing);
        } else {
            toCreate.push({
                configKey,
                data: {
                    name: macroData.name,
                    type: "script",
                    img: macroData.img,
                    command: macroData.command,
                    ownership: { default: desiredOwnership },
                    flags: { "definitely-wizards": macroData.flags },
                },
            });
        }
    }

    if (toCreate.length > 0) {
        const created = await Macro.createDocuments(toCreate.map((entry) => entry.data));
        toCreate.forEach((entry, index) => {
            if (created[index]) {
                byKey.set(entry.configKey, created[index]);
            }
        });
    }

    return byKey;
}

/**
 * Populate slots 1-4 on empty, unseeded non-GM player hotbars with the default
 * Wizard and Wild stat roll macros.
 * @param {object} [options]
 * @param {UserDocumentLike | null} [options.targetUser=null]
 * @returns {Promise<void>}
 */
export async function seedDefaultPlayerHotbars({ targetUser = null } = {}) {
    if (!game.users.activeGM?.isSelf) return;
    if (!game.settings.get("definitely-wizards", "autoPopulateHotbar")) return;

    const candidates = (targetUser ? [targetUser] : game.users.filter((user) => !user.isGM)).filter(
        (user) => {
            if (!user || user.isGM) return false;
            if (user.getFlag?.("definitely-wizards", "hotbarSeeded")) return false;
            return Object.keys(user.hotbar ?? {}).length === 0;
        },
    );
    if (candidates.length === 0) return;

    const macrosByKey = await ensureDefaultPlayerMacros();
    /** @type {Record<string, string>} */
    const hotbar = {};
    DEFAULT_PLAYER_STAT_KEYS.forEach((key, index) => {
        const configKey = /** @type {keyof typeof STAT_MACRO_CONFIGS} */ (key);
        const macro = macrosByKey.get(configKey);
        if (macro?.id) {
            hotbar[String(index + 1)] = macro.id;
        }
    });
    if (Object.keys(hotbar).length === 0) return;

    for (const user of candidates) {
        await user.update?.({
            hotbar,
            "flags.definitely-wizards.hotbarSeeded": true,
        });
    }
}

/**
 * Create and assign a hotbar macro for a dragged Spell, Prop, or MiscItem.
 * @param {Record<string, any>} data
 * @param {number | string} slot
 */
async function createItemMacro(data, slot) {
    const item = await Item.fromDropData(data);
    if (!item?.uuid) return;

    const command = `await game.definitelyWizards?.rollItemMacro(${JSON.stringify(item.uuid)});`;
    await findOrCreateAndAssignMacro(
        {
            name: item.name,
            img: getMacroImageForItem(item),
            command,
            flags: { itemUuid: item.uuid },
        },
        slot,
    );
}

/**
 * Intercept Hotbar drops for Definitely Wizards stat rolls and Items.
 * Must synchronously return false when handled so core Hotbar does not overwrite the slot.
 * @param {any} _bar
 * @param {Record<string, any>} data
 * @param {number | string} slot
 * @returns {boolean | void}
 */
export function onHotbarDrop(_bar, data, slot) {
    if (data?.type === STAT_MACRO_TYPE) {
        void createStatRollMacro(data, slot);
        return false;
    }
    if (data?.type === "Item") {
        void createItemMacro(data, slot);
        return false;
    }
    return true;
}
