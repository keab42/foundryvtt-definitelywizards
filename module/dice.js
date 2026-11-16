const CONSEQUENCES_ROLL = "1d6";

/**
 * Enrich HTML content through Foundry's TextEditor with document roll data and secret visibility.
 * @param {string | null | undefined} html
 * @param {object} [options]
 * @param {Actor | Item | null} [options.document=null]
 * @param {boolean} [options.secrets=false]
 * @returns {Promise<string>}
 */
export async function enrichHtml(html, { document = null, secrets = false } = {}) {
    return foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", {
        secrets,
        rollData: document ? () => document.getRollData() : undefined,
        relativeTo: document ?? undefined,
    });
}

/**
 * Resolve an Actor document from a UUID or world Actor ID.
 * @param {string} actorRef
 * @returns {Promise<DefinitelyWizardsActorLike | null>}
 */
export async function resolveActor(actorRef) {
    if (!actorRef) return null;
    if (actorRef.includes(".")) {
        const doc = await foundry.utils.fromUuid(actorRef);
        if (doc?.documentName === "Actor") {
            return doc;
        }
    }
    return game.actors.get(actorRef) ?? null;
}

/**
 * Roll a Wizard or Wild check, enforcing stat-6 lockouts, Wit Bonus display, and opposite-stat resets.
 * @param {Actor} actor
 * @param {RollSkillOptions} [options]
 * @returns {Promise<ChatMessage | undefined | null>}
 */
export async function rollSkill(
    actor,
    { isWizardRoll = true, formula = "1d6", spell = null, customSpellName = "" } = {},
) {
    const wizardVal = Number(actor.system.stats.wizard);
    const wildVal = Number(actor.system.stats.wild);

    if (wildVal >= 7) {
        ui.notifications.warn(game.i18n.localize("DW.AlreadyArrestedWarning"));
        return null;
    }
    if (wizardVal >= 6 && wildVal >= 6) {
        ui.notifications.warn(game.i18n.localize("DW.BothStatsLockedWarning"));
        return null;
    }
    if (isWizardRoll && wizardVal >= 6) {
        ui.notifications.warn(game.i18n.localize("DW.WizardLockedWarning"));
        return null;
    }
    if (!isWizardRoll && wildVal >= 6) {
        ui.notifications.warn(game.i18n.localize("DW.WildLockedWarning"));
        return null;
    }

    const currentValue = isWizardRoll ? wizardVal : wildVal;
    const wasOppositeLocked = isWizardRoll ? wildVal === 6 : wizardVal === 6;

    const roll = new Roll(formula, actor.getRollData());
    await roll.evaluate();

    const isSuccess = roll.total <= currentValue;
    const isWitBonus = formula.startsWith("2d6");
    const diceResults =
        roll.dice[0]?.results?.map((dieResult) => ({
            result: dieResult.result,
            active: Boolean(dieResult.active),
        })) ?? [];

    const autoResetWild = isSuccess && isWizardRoll && wasOppositeLocked;
    const autoResetWizard = isSuccess && !isWizardRoll && wasOppositeLocked;

    const trimmedCustomSpell = typeof customSpellName === "string" ? customSpellName.trim() : "";
    const spellDescription = spell?.system?.description
        ? await enrichHtml(spell.system.description, { document: spell, secrets: spell.isOwner })
        : "";

    const template = "systems/definitely-wizards/templates/chat/skill-roll-chat.hbs";
    const templateData = {
        isWizardRoll,
        isSuccess,
        isWitBonus,
        diceResults,
        diceFormula: roll.formula,
        diceTotal: roll.total,
        autoResetWizard,
        autoResetWild,
        owner: actor.id,
        actorUuid: actor.uuid,
        actorName: actor.name,
        spellName: trimmedCustomSpell || spell?.name || "",
        spellDescription,
        spellImg: spell?.img ?? "",
    };

    const message = await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: await foundry.applications.handlebars.renderTemplate(template, templateData),
        rolls: [roll],
        sound: CONFIG.sounds.dice,
    });

    if (isSuccess && isWizardRoll) {
        await actor.updateStat?.(true, 1, { suppressBothLockedAlert: wasOppositeLocked });
        if (autoResetWild) {
            await actor.resetStat?.(false);
        }
    } else if (autoResetWizard) {
        await actor.resetStat?.(true);
    }

    return message;
}

/**
 * Roll 1d6 on the consequences table for a failed Wizard or Wild roll.
 * @param {string} actorRef
 * @param {boolean} isWizardRoll
 * @param {object} [options]
 * @param {string} [options.sourceMessageId=""]
 * @returns {Promise<ChatMessage | undefined | null>}
 */
export async function rollConsequences(actorRef, isWizardRoll, { sourceMessageId = "" } = {}) {
    const actor = await resolveActor(actorRef);
    if (!actor) return null;

    const roll = new Roll(CONSEQUENCES_ROLL, actor.getRollData());
    await roll.evaluate();

    const shouldIncreaseWild = roll.total > 2;
    let resultMessage = "";
    if (!shouldIncreaseWild) {
        resultMessage = isWizardRoll
            ? game.i18n.localize("DW.WizardDudConsequence")
            : game.i18n.localize("DW.WildDudConsequence");
    } else if (roll.total <= 4) {
        resultMessage = isWizardRoll
            ? game.i18n.localize("DW.WizardMinorFailConsequence")
            : game.i18n.localize("DW.WildMinorFailConsequence");
    } else {
        resultMessage = isWizardRoll
            ? game.i18n.localize("DW.WizardCriticalFailConsequence")
            : game.i18n.localize("DW.WildCriticalFailConsequence");
    }

    const template = "systems/definitely-wizards/templates/chat/consequences-roll-chat.hbs";
    const templateData = {
        isWizardRoll,
        resultMessage,
        diceFormula: roll.formula,
        diceTotal: roll.total,
        owner: actor.id,
        actorUuid: actor.uuid,
    };

    const message = await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content: await foundry.applications.handlebars.renderTemplate(template, templateData),
        rolls: [roll],
        sound: CONFIG.sounds.dice,
        flags: sourceMessageId
            ? {
                  "definitely-wizards": {
                      resolvedMessageId: sourceMessageId,
                      resolutionType: "consequences",
                      resolverName: actor.name,
                  },
              }
            : {},
    });

    if (shouldIncreaseWild) {
        await actor.updateStat(false, 1);
    }

    return message;
}

/**
 * Cause a distraction to Cover for a teammate's failed roll (+1 Wild on the covering actor).
 * @param {DefinitelyWizardsActorLike} coveringActor
 * @param {string} sourceMessageId
 * @param {string} targetActorName
 * @returns {Promise<ChatMessage | undefined>}
 */
export async function coverForRoll(coveringActor, sourceMessageId, targetActorName) {
    const safeCoverer = foundry.utils.escapeHTML(coveringActor.name);
    const targetName = targetActorName || game.i18n.localize("DW.TeammateFallback");
    const safeTarget = foundry.utils.escapeHTML(targetName);
    const safeCoverActorUuid = foundry.utils.escapeHTML(coveringActor.uuid);
    const undoLabel = foundry.utils.escapeHTML(game.i18n.localize("DW.UndoCoverButton"));

    const coverMessage = await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: coveringActor }),
        content: `<div class="definitelywizards chat-card cover-card dw-wild-card">
            <p>${game.i18n.format("DW.CoverMessage", {
                coverer: safeCoverer,
                target: safeTarget,
            })}</p>
            <div class="card-buttons">
                <button type="button" class="undoCover" data-actor-uuid="${safeCoverActorUuid}">${undoLabel}</button>
            </div>
        </div>`,
        flags: {
            "definitely-wizards": {
                resolvedMessageId: sourceMessageId,
                resolutionType: "covered",
                resolverName: coveringActor.name,
                coveringActorUuid: coveringActor.uuid,
                relatedMessageIds: [],
            },
        },
    });

    /** @type {string[]} */
    const relatedMessageIds = [];
    await coveringActor.updateStat(false, 1, { createdMessageIds: relatedMessageIds });
    if (coverMessage && relatedMessageIds.length > 0) {
        await coverMessage.update({
            "flags.definitely-wizards.relatedMessageIds": relatedMessageIds,
        });
    }

    return coverMessage;
}

/**
 * Collect owned character actors across scene tokens and world actors without unlinked token duplication.
 * @param {object} [options]
 * @param {string} [options.excludeUuid=""]
 * @param {boolean} [options.skipArrested=false]
 * @returns {{
 *   candidates: DefinitelyWizardsActorLike[],
 *   hasArrestedCandidate: boolean,
 *   hasExcluded: boolean,
 * }}
 */
export function collectOwnedCharacters({ excludeUuid = "", skipArrested = false } = {}) {
    const sceneTokens = canvas?.tokens?.placeables?.length
        ? canvas.tokens.placeables
        : (game.scenes?.active?.tokens ?? game.scenes?.current?.tokens ?? []);

    /** @type {Map<string, DefinitelyWizardsActorLike>} */
    const candidatesByUuid = new Map();
    /** @type {Set<string>} */
    const unlinkedBaseIds = new Set();
    let hasArrestedCandidate = false;
    let hasExcluded = false;

    /** @param {DefinitelyWizardsActorLike | null | undefined} actor */
    const considerActor = (actor) => {
        if (actor?.type !== "character" || !actor.isOwner) return;
        if (excludeUuid && actor.uuid === excludeUuid) {
            hasExcluded = true;
            return;
        }
        if (skipArrested && Number(actor.system?.stats?.wild) >= 7) {
            hasArrestedCandidate = true;
            return;
        }
        if (!candidatesByUuid.has(actor.uuid)) {
            candidatesByUuid.set(actor.uuid, actor);
        }
    };

    for (const token of sceneTokens) {
        const actor = token?.actor;
        if (actor?.type === "character" && actor.isOwner && actor.isToken) {
            unlinkedBaseIds.add(actor.id);
        }
        considerActor(actor);
    }

    for (const actor of game.actors.filter((a) => a.type === "character" && a.isOwner)) {
        if (unlinkedBaseIds.has(actor.id)) continue;
        considerActor(actor);
    }

    return {
        candidates: Array.from(candidatesByUuid.values()),
        hasArrestedCandidate,
        hasExcluded,
    };
}

/**
 * Prompt the user to choose one character from a candidate list using DialogV2.
 * @param {object} options
 * @param {DefinitelyWizardsActorLike[]} options.candidates
 * @param {string} [options.defaultUuid=""]
 * @param {string} options.title
 * @param {string} options.prompt
 * @param {string} options.confirmLabel
 * @param {(actor: DefinitelyWizardsActorLike) => string} [options.formatOption]
 * @returns {Promise<DefinitelyWizardsActorLike | null>}
 */
export async function promptActorChoice({
    candidates,
    defaultUuid = "",
    title,
    prompt,
    confirmLabel,
    formatOption = (actor) => actor.name,
}) {
    if (candidates.length === 0) return null;
    const selectedUuid = defaultUuid || candidates[0].uuid;

    const optionsHtml = candidates
        .map((actor) => {
            const isSelected = actor.uuid === selectedUuid ? " selected" : "";
            const label = foundry.utils.escapeHTML(formatOption(actor));
            return `<option value="${foundry.utils.escapeHTML(actor.uuid)}"${isSelected}>${label}</option>`;
        })
        .join("");

    const result = await foundry.applications.api.DialogV2.input({
        window: { title },
        content: `<div class="form-group"><label>${foundry.utils.escapeHTML(prompt)}</label><select name="actorUuid">${optionsHtml}</select></div>`,
        ok: { label: confirmLabel },
        buttons: [
            {
                action: "cancel",
                label: game.i18n.localize("DW.CancelButton"),
                icon: "fa-solid fa-xmark",
                type: "button",
                callback: () => null,
            },
        ],
        rejectClose: false,
        modal: true,
    });

    if (!result?.actorUuid) return null;
    return resolveActor(String(result.actorUuid));
}

/**
 * Post an item description card to chat, including Prop Costuming buttons when bound to an actor.
 * @param {Actor | null | undefined} actor
 * @param {Item} item
 * @returns {Promise<ChatMessage | undefined>}
 */
export async function postItemCard(actor, item) {
    const safeName = foundry.utils.escapeHTML(item.name);
    const safeImg = foundry.utils.escapeHTML(item.img ?? "");
    const enrichedDescription = await enrichHtml(item.system.description, {
        document: item,
        secrets: item.isOwner,
    });

    let costumingButtons = "";
    if (item.type === "Prop" && actor) {
        const safeActorUuid = foundry.utils.escapeHTML(actor.uuid);
        costumingButtons = `
            <div class="card-buttons">
                <button type="button" class="propCostumingChat" data-actor-uuid="${safeActorUuid}" data-stat="wizard" data-prop-name="${safeName}">
                    ${game.i18n.localize("DW.CostumingWizardButton")}
                </button>
                <button type="button" class="propCostumingChat" data-actor-uuid="${safeActorUuid}" data-stat="wild" data-prop-name="${safeName}">
                    ${game.i18n.localize("DW.CostumingWildButton")}
                </button>
            </div>`;
    }

    const cardVariantClass = item.type === "Spell" ? " dw-wizard-card" : "";

    return ChatMessage.create({
        speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
        content: `
            <div class="definitelywizards chat-card${cardVariantClass}">
                <div class="chatItem flexrow">
                    <div class="item-image" tabindex="0" aria-label="${safeName}" style="background-image: url('${safeImg}')"></div>
                    <h4>${safeName}</h4>
                </div>
                <div>${enrichedDescription}</div>
                ${costumingButtons}
            </div>`,
    });
}
