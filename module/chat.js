import * as Dice from "./dice.js";

/**
 * Find any existing resolution ChatMessage for a given skill-roll ChatMessage ID.
 * @param {string | undefined} messageId
 * @param {object} [options]
 * @param {string} [options.excludeMessageId=""]
 * @returns {ChatMessage | undefined}
 */
function findResolutionMessage(messageId, { excludeMessageId = "" } = {}) {
    if (!messageId) return undefined;
    return game.messages.find(
        (msg) =>
            msg.id !== excludeMessageId &&
            msg.getFlag("definitely-wizards", "resolvedMessageId") === messageId,
    );
}

/**
 * Format a localized resolution status label from a resolution message.
 * @param {ChatMessage} resolutionMessage
 * @returns {string}
 */
function formatResolutionLabel(resolutionMessage) {
    const type = resolutionMessage.getFlag("definitely-wizards", "resolutionType");
    const resolverName = resolutionMessage.getFlag("definitely-wizards", "resolverName") ?? "";
    if (type === "covered") {
        return game.i18n.format("DW.CoveredStatus", { name: resolverName });
    }
    if (type === "disguise-failed") {
        return game.i18n.localize("DW.DisguiseWildAppliedStatus");
    }
    return game.i18n.localize("DW.ConsequencesRolledStatus");
}

/**
 * Locate the `.skill-roll` card element within or on a chat message element.
 * @param {HTMLElement} html
 * @returns {HTMLElement | null}
 */
function findSkillRollCard(html) {
    if (html.classList?.contains("skill-roll")) return html;
    return html.querySelector(".skill-roll");
}

/**
 * Disable action buttons on a skill-roll card and render its resolution status badge.
 * @param {HTMLElement} html
 * @param {ChatMessage} resolutionMessage
 */
function applyResolvedState(html, resolutionMessage) {
    const card = findSkillRollCard(html);
    if (!card) return;

    for (const btn of card.querySelectorAll(
        "button.rollConsequences, button.coverRoll, button.addWildDisguiseFail",
    )) {
        /** @type {HTMLButtonElement} */ (btn).disabled = true;
    }

    const buttonsContainer = card.querySelector(".card-buttons");
    if (!buttonsContainer) return;

    let badge = buttonsContainer.querySelector(".dw-resolution-status");
    if (!badge) {
        badge = document.createElement("div");
        badge.className = "dw-resolution-status";
        buttonsContainer.appendChild(badge);
    }
    badge.textContent = formatResolutionLabel(resolutionMessage);
}

/**
 * Re-enable action buttons on a skill-roll card and remove its resolution status badge.
 * @param {HTMLElement} html
 */
function clearResolvedState(html) {
    const card = findSkillRollCard(html);
    if (!card) return;

    for (const btn of card.querySelectorAll(
        "button.rollConsequences, button.coverRoll, button.addWildDisguiseFail",
    )) {
        /** @type {HTMLButtonElement} */ (btn).disabled = false;
    }

    card.querySelector(".dw-resolution-status")?.remove();
}

/**
 * Restore a clicked action button after cancellation/failure, or sync resolved state if resolved elsewhere.
 * @param {HTMLElement} card
 * @param {HTMLButtonElement} button
 * @param {string | undefined} messageId
 */
function restoreOrSyncCard(card, button, messageId) {
    const existing = findResolutionMessage(messageId);
    if (existing) {
        const container = /** @type {HTMLElement} */ (card.closest("[data-message-id]") ?? card);
        applyResolvedState(container, existing);
    } else {
        button.disabled = false;
    }
}

/**
 * Attach click listeners and resolved state to rendered chat message HTML elements.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function addChatListeners(message, html) {
    const skillCard = findSkillRollCard(html);
    const costumingButtons = html.querySelectorAll("button.propCostumingChat");
    const undoCoverButtons = html.querySelectorAll("button.undoCover");
    if (!skillCard && costumingButtons.length === 0 && undoCoverButtons.length === 0) return;

    if (skillCard) {
        const resolution = findResolutionMessage(message?.id);
        if (resolution) {
            applyResolvedState(html, resolution);
        }

        for (const button of skillCard.querySelectorAll("button.rollConsequences")) {
            button.addEventListener("click", (event) => onRollConsequences(event, message));
        }

        for (const button of skillCard.querySelectorAll("button.coverRoll")) {
            button.addEventListener("click", (event) => onCoverRoll(event, message));
        }

        for (const button of skillCard.querySelectorAll("button.addWildDisguiseFail")) {
            button.addEventListener("click", (event) => onWildDisguiseFail(event, message));
        }
    }

    for (const button of costumingButtons) {
        button.addEventListener("click", onPropCostumingChat);
    }

    for (const button of undoCoverButtons) {
        button.addEventListener("click", (event) => onUndoCover(event, message));
    }
}

/**
 * Sync newly created resolution messages back onto the original skill-roll card across all rendered views.
 * @param {ChatMessage} message
 */
export function onCreateChatMessage(message) {
    const resolvedId = message.getFlag("definitely-wizards", "resolvedMessageId");
    if (!resolvedId) return;

    const safeId = CSS.escape(String(resolvedId));
    const elements = document.querySelectorAll(`[data-message-id="${safeId}"]`);
    for (const el of elements) {
        applyResolvedState(/** @type {HTMLElement} */ (el), message);
    }
}

/**
 * Re-enable the original skill-roll card's buttons when its resolution message is deleted.
 * @param {ChatMessage} message
 */
export function onDeleteChatMessage(message) {
    const resolvedId = message.getFlag("definitely-wizards", "resolvedMessageId");
    if (!resolvedId) return;

    const remainingResolution = findResolutionMessage(resolvedId, {
        excludeMessageId: message.id,
    });
    const safeId = CSS.escape(String(resolvedId));
    const elements = document.querySelectorAll(`[data-message-id="${safeId}"]`);
    for (const el of elements) {
        if (remainingResolution) {
            applyResolvedState(/** @type {HTMLElement} */ (el), remainingResolution);
        } else {
            clearResolvedState(/** @type {HTMLElement} */ (el));
        }
    }
}

/**
 * Handle clicking "Roll for Consequences" on a failed skill roll card.
 * @param {Event} event
 * @param {ChatMessage} message
 */
async function onRollConsequences(event, message) {
    const button = /** @type {HTMLButtonElement | null} */ (event.currentTarget);
    const card = /** @type {HTMLElement | null} */ (button?.closest(".skill-roll"));
    if (!button || !card || button.disabled) return;

    button.disabled = true;
    let resolved = false;

    try {
        if (findResolutionMessage(message?.id)) {
            ui.notifications.warn(game.i18n.localize("DW.AlreadyResolvedWarning"));
            return;
        }

        const actorRef = card.dataset.actorUuid || card.dataset.ownerId || "";
        const actor = await Dice.resolveActor(actorRef);
        if (!actor) return;

        if (!actor.isOwner && !game.user.isGM) {
            ui.notifications.warn(game.i18n.localize("DW.OnlyOwnerConsequences"));
            return;
        }

        if (findResolutionMessage(message?.id)) {
            ui.notifications.warn(game.i18n.localize("DW.AlreadyResolvedWarning"));
            return;
        }

        const isWizardRoll = card.dataset.iswizardroll === "true";
        const result = await Dice.rollConsequences(actorRef, isWizardRoll, {
            sourceMessageId: message?.id ?? "",
        });
        resolved = Boolean(result);
    } finally {
        if (!resolved) {
            restoreOrSyncCard(card, button, message?.id);
        }
    }
}

/**
 * Resolve which party character is causing a distraction to Cover a failed roll.
 * @param {string} failedActorUuid
 * @returns {Promise<DefinitelyWizardsActorLike | null>}
 */
async function resolveCoveringActor(failedActorUuid) {
    const controlled =
        canvas.tokens?.controlled
            .map((token) => token.actor)
            .filter((actor) => actor && actor.type === "character" && actor.isOwner) ?? [];

    // Fast path: selecting 1 eligible covering token covers immediately without a dialog.
    // If only the failed caster's token is selected, fall through to let another character cover.
    if (controlled.length === 1) {
        const selected = controlled[0];
        if (selected.uuid !== failedActorUuid) {
            if (Number(selected.system?.stats?.wild) >= 7) {
                ui.notifications.warn(game.i18n.localize("DW.AlreadyArrestedWarning"));
                return null;
            }
            return selected;
        }
    }

    const assigned = game.user.character;
    if (
        assigned &&
        assigned.type === "character" &&
        assigned.isOwner &&
        assigned.uuid !== failedActorUuid &&
        !game.user.isGM &&
        Number(assigned.system?.stats?.wild) < 7
    ) {
        return assigned;
    }

    const {
        candidates,
        hasArrestedCandidate,
        hasExcluded: hasOwnCaster,
    } = Dice.collectOwnedCharacters({
        excludeUuid: failedActorUuid,
        skipArrested: true,
    });

    if (candidates.length === 0) {
        if ((assigned && Number(assigned.system?.stats?.wild) >= 7) || hasArrestedCandidate) {
            ui.notifications.warn(game.i18n.localize("DW.AlreadyArrestedWarning"));
        } else if (assigned?.uuid === failedActorUuid || hasOwnCaster) {
            ui.notifications.warn(game.i18n.localize("DW.CoverOwnSpellWarning"));
        } else {
            ui.notifications.warn(game.i18n.localize("DW.NoCoveringCharacter"));
        }
        return null;
    }

    const defaultSelectedUuid =
        controlled.find(
            (actor) => actor.uuid !== failedActorUuid && Number(actor.system?.stats?.wild) < 7,
        )?.uuid ?? candidates[0].uuid;

    return Dice.promptActorChoice({
        candidates,
        defaultUuid: defaultSelectedUuid,
        title: game.i18n.localize("DW.ChooseCoveringActorTitle"),
        prompt: game.i18n.localize("DW.ChooseCoveringActorPrompt"),
        confirmLabel: game.i18n.localize("DW.CoverButton"),
        formatOption: (actor) =>
            `${actor.name} (${game.i18n.localize("DW.Wild")}: ${actor.system.stats.wild})`,
    });
}

/**
 * Handle clicking "Cover (+1 Wild)" on a teammate's failed skill roll card.
 * @param {Event} event
 * @param {ChatMessage} message
 */
async function onCoverRoll(event, message) {
    const button = /** @type {HTMLButtonElement | null} */ (event.currentTarget);
    const card = /** @type {HTMLElement | null} */ (button?.closest(".skill-roll"));
    if (!button || !card || button.disabled) return;

    button.disabled = true;
    let resolved = false;

    try {
        if (findResolutionMessage(message?.id)) {
            ui.notifications.warn(game.i18n.localize("DW.AlreadyResolvedWarning"));
            return;
        }

        const failedActorUuid = card.dataset.actorUuid || "";
        const failedActorName = card.dataset.actorName || "";

        const coveringActor = await resolveCoveringActor(failedActorUuid);
        if (!coveringActor) return;

        const currentWild = Number(coveringActor.system.stats.wild);
        if (currentWild >= 6) {
            const confirmed = await foundry.applications.api.DialogV2.confirm({
                window: { title: game.i18n.localize("DW.CoverArrestConfirmTitle") },
                content: `<p>${game.i18n.format("DW.CoverArrestConfirmContent", {
                    name: foundry.utils.escapeHTML(coveringActor.name),
                    wild: currentWild,
                    nextWild: currentWild + 1,
                })}</p>`,
                rejectClose: false,
                modal: true,
            });
            if (!confirmed) return;
        }

        if (findResolutionMessage(message?.id)) {
            ui.notifications.warn(game.i18n.localize("DW.AlreadyResolvedWarning"));
            return;
        }

        const result = await Dice.coverForRoll(coveringActor, message?.id ?? "", failedActorName);
        resolved = Boolean(result);
    } finally {
        if (!resolved) {
            restoreOrSyncCard(card, button, message?.id);
        }
    }
}

/**
 * Handle clicking "Couldn't Disguise (+1 Wild)" on a successful Wild spell chat card.
 * @param {Event} event
 * @param {ChatMessage} message
 */
async function onWildDisguiseFail(event, message) {
    const button = /** @type {HTMLButtonElement | null} */ (event.currentTarget);
    const card = /** @type {HTMLElement | null} */ (button?.closest(".skill-roll"));
    if (!button || !card || button.disabled) return;

    button.disabled = true;
    let resolved = false;

    try {
        if (findResolutionMessage(message?.id)) {
            ui.notifications.warn(game.i18n.localize("DW.AlreadyResolvedWarning"));
            return;
        }

        const actorRef = card.dataset.actorUuid || card.dataset.ownerId || "";
        const actor = await Dice.resolveActor(actorRef);
        if (!actor) return;

        if (!actor.isOwner && !game.user.isGM) {
            ui.notifications.warn(game.i18n.localize("DW.OnlyOwnerDisguise"));
            return;
        }

        if (findResolutionMessage(message?.id)) {
            ui.notifications.warn(game.i18n.localize("DW.AlreadyResolvedWarning"));
            return;
        }

        const created = await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `<div class="definitelywizards chat-card dw-wild-card"><p>${foundry.utils.escapeHTML(actor.name)}: +1 ${game.i18n.localize("DW.Wild")}</p></div>`,
            style: CONST.CHAT_MESSAGE_STYLES.OOC,
            flags: message?.id
                ? {
                      "definitely-wizards": {
                          resolvedMessageId: message.id,
                          resolutionType: "disguise-failed",
                          resolverName: actor.name,
                      },
                  }
                : {},
        });
        if (created) {
            await actor.updateStat(false, 1);
        }
        resolved = Boolean(created);
    } finally {
        if (!resolved) {
            restoreOrSyncCard(card, button, message?.id);
        }
    }
}

/**
 * Handle clicking "Undo Cover (-1 Wild)" on a Cover chat card.
 * @param {Event} event
 * @param {ChatMessage} message
 */
async function onUndoCover(event, message) {
    const button = /** @type {HTMLButtonElement | null} */ (event.currentTarget);
    if (!button || button.disabled) return;

    button.disabled = true;
    let undone = false;

    try {
        if (!message?.id || !game.messages.get(message.id)) return;

        const actorRef =
            message.getFlag("definitely-wizards", "coveringActorUuid") ||
            button.dataset.actorUuid ||
            "";
        const actor = await Dice.resolveActor(actorRef);

        if (actor && !actor.isOwner && !game.user.isGM) {
            ui.notifications.warn(game.i18n.localize("DW.OnlyOwnerUndoCover"));
            return;
        }

        if (!message.canUserModify(game.user, "delete")) {
            ui.notifications.warn(game.i18n.localize("DW.CannotUndoCoverPermission"));
            return;
        }

        if (actor && Number(actor.system?.stats?.wild) > 0) {
            await actor.updateStat(false, -1, { silent: true });
        }

        const relatedIds = message.getFlag("definitely-wizards", "relatedMessageIds");
        if (Array.isArray(relatedIds)) {
            for (const msgId of relatedIds) {
                const relatedMsg = game.messages.get(String(msgId));
                if (relatedMsg?.canUserModify(game.user, "delete")) {
                    await relatedMsg.delete();
                }
            }
        }

        await message.delete();
        undone = true;
    } finally {
        if (!undone && button.isConnected) {
            button.disabled = false;
        }
    }
}

/**
 * Handle Costuming (+1 Wizard / -1 Wild) buttons rendered inside a Prop chat card.
 * @param {Event} event
 */
async function onPropCostumingChat(event) {
    const button = /** @type {HTMLButtonElement | null} */ (event.currentTarget);
    if (!button) return;

    const actorRef = button.dataset.actorUuid ?? "";
    const actor = await Dice.resolveActor(actorRef);
    if (!actor) return;

    if (!actor.isOwner && !game.user.isGM) {
        ui.notifications.warn(game.i18n.localize("DW.OnlyOwnerCostuming"));
        return;
    }

    const isWizard = button.dataset.stat === "wizard";
    const propName = button.dataset.propName ?? game.i18n.localize("DW.PropFallbackName");
    await actor.applyCostuming(isWizard, propName);
}
