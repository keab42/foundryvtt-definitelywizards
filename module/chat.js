import * as Dice from "./dice.js";

/**
 * Attach click listeners to rendered chat message HTML elements.
 * @param {HTMLElement} html
 */
export function addChatListeners(html) {
    for (const button of html.querySelectorAll("button.rollConsequences")) {
        button.addEventListener("click", onRollConsequences);
    }
}

/**
 * Handle clicking the "Roll for Consequences" button on a failed skill roll card.
 * @param {Event} event
 */
function onRollConsequences(event) {
    const target = /** @type {HTMLElement | null} */ (event.currentTarget);
    const card = /** @type {HTMLElement | null} */ (target?.closest(".skill-roll"));
    if (!card) return;

    const actorID = card.dataset.ownerId ?? "";
    const isWizardRoll = card.dataset.iswizardroll === "true";

    Dice.rollConsequences(actorID, isWizardRoll);
}
