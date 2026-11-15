// Ambient TypeScript declarations for Foundry VTT v14 APIs used by Definitely Wizards

declare namespace foundry {
    namespace utils {
        function mergeObject<T extends object, U extends object>(
            original: T,
            other?: U,
            options?: Record<string, unknown>,
        ): T & U;
        function fetchJsonWithTimeout(url: string, options?: Record<string, unknown>): Promise<any>;
        function isNewerVersion(v1: string, v0: string): boolean;
    }

    namespace data {
        namespace fields {
            interface DataFieldOptions {
                required?: boolean;
                nullable?: boolean;
                initial?: any;
                blank?: boolean;
                label?: string;
                hint?: string;
                integer?: boolean;
                min?: number;
                max?: number;
            }
            class DataField {
                constructor(options?: DataFieldOptions);
            }
            class StringField extends DataField {}
            class NumberField extends DataField {}
            class BooleanField extends DataField {}
            class HTMLField extends DataField {}
            class SchemaField extends DataField {
                constructor(fields: Record<string, DataField>, options?: DataFieldOptions);
            }
        }
    }

    namespace abstract {
        class DataModel {
            static defineSchema(): Record<string, foundry.data.fields.DataField>;
            static migrateData(source: Record<string, any>): Record<string, any>;
            toObject(source?: boolean): Record<string, any>;
        }
        class TypeDataModel extends DataModel {
            parent: any;
            prepareBaseData(): void;
            prepareDerivedData(): void;
        }
    }

    namespace applications {
        namespace api {
            interface ApplicationV2Options {
                id?: string;
                classes?: string[];
                tag?: string;
                window?: {
                    title?: string;
                    icon?: string;
                    resizable?: boolean;
                    minimizable?: boolean;
                    controls?: any[];
                };
                actions?: Record<
                    string,
                    | ((event: PointerEvent, target: HTMLElement) => void | Promise<void>)
                    | {
                          handler: (
                              event: PointerEvent,
                              target: HTMLElement,
                          ) => void | Promise<void>;
                          buttons?: number[];
                      }
                >;
                form?: {
                    handler?: (
                        event: SubmitEvent | Event,
                        form: HTMLFormElement,
                        formData: any,
                    ) => Promise<void>;
                    submitOnChange?: boolean;
                    closeOnSubmit?: boolean;
                };
                position?: {
                    width?: number | "auto";
                    height?: number | "auto";
                    top?: number;
                    left?: number;
                };
                dragDrop?: Array<{ dragSelector?: string | null; dropSelector?: string | null }>;
            }

            class ApplicationV2 {
                static DEFAULT_OPTIONS: ApplicationV2Options;
                static PARTS: Record<
                    string,
                    {
                        template: string;
                        templates?: string[];
                        scrollable?: string[];
                    }
                >;
                static TABS: Record<
                    string,
                    {
                        tabs: Array<{
                            id: string;
                            group?: string;
                            icon?: string;
                            label?: string;
                        }>;
                        initial?: string;
                        labelPrefix?: string;
                    }
                >;
                options: ApplicationV2Options;
                element: HTMLElement;
                tabGroups: Record<string, string>;
                readonly isEditable: boolean;
                render(options?: boolean | Record<string, any>): Promise<this>;
                close(options?: Record<string, any>): Promise<this>;
                changeTab(
                    tab: string,
                    group: string,
                    options?: {
                        event?: Event;
                        navElement?: HTMLElement;
                        force?: boolean;
                        updatePosition?: boolean;
                    },
                ): void;
                _prepareContext(options: Record<string, any>): Promise<Record<string, any>>;
                _prepareTabs(group: string): Record<
                    string,
                    {
                        id: string;
                        group: string;
                        icon?: string;
                        label?: string;
                        active: boolean;
                        cssClass: string;
                    }
                >;
                _onRender(context: Record<string, any>, options: Record<string, any>): Promise<void>;
            }

            class DocumentSheetV2 extends ApplicationV2 {
                readonly document: any;
                _prepareSubmitData(
                    event: SubmitEvent | Event,
                    form: HTMLFormElement,
                    formData: any,
                    updateData?: Record<string, any>,
                ): Record<string, any>;
            }

            function HandlebarsApplicationMixin<T extends new (...args: any[]) => ApplicationV2>(
                BaseApplication: T,
            ): T;

            class DialogV2 extends ApplicationV2 {
                static confirm(config?: {
                    window?: { title?: string; icon?: string };
                    content?: string;
                    yes?: {
                        label?: string;
                        icon?: string;
                        callback?: (
                            event: PointerEvent | SubmitEvent,
                            button: HTMLButtonElement,
                            dialog: DialogV2,
                        ) => any;
                    };
                    no?: {
                        label?: string;
                        icon?: string;
                        default?: boolean;
                    };
                    rejectClose?: boolean;
                    modal?: boolean;
                }): Promise<boolean | null>;
            }
        }

        namespace sheets {
            class ActorSheetV2 extends foundry.applications.api.DocumentSheetV2 {
                readonly actor: Actor;
            }
            class ItemSheetV2 extends foundry.applications.api.DocumentSheetV2 {
                readonly item: Item;
            }
        }

        namespace apps {
            class DocumentSheetConfig {
                static registerSheet(
                    documentClass: any,
                    scope: string,
                    sheetClass: any,
                    options?: {
                        types?: string[];
                        makeDefault?: boolean;
                        label?: string;
                    },
                ): void;
                static unregisterSheet(
                    documentClass: any,
                    scope: string,
                    sheetClass: any,
                    options?: { types?: string[] },
                ): void;
            }
        }

        namespace handlebars {
            function renderTemplate(path: string, data?: Record<string, any>): Promise<string>;
        }

        namespace ux {
            class TextEditor {
                static implementation: {
                    enrichHTML(
                        content: string,
                        options?: {
                            secrets?: boolean;
                            documents?: boolean;
                            links?: boolean;
                            rolls?: boolean;
                            embeds?: boolean;
                            rollData?: Record<string, any> | (() => Record<string, any>);
                            relativeTo?: any;
                        },
                    ): Promise<string>;
                };
            }
        }
    }

    namespace appv1 {
        namespace sheets {
            class ActorSheet {}
            class ItemSheet {}
        }
    }
}

declare class Actor {
    static DEFAULT_ICON: string;
    id: string;
    _id: string;
    name: string;
    img: string;
    type: string;
    isOwner: boolean;
    system: Record<string, any>;
    items: {
        get(id: string): Item | undefined;
        contents: Item[];
        [Symbol.iterator](): IterableIterator<Item>;
    };
    sheet: {
        render(force?: boolean | Record<string, any>): Promise<any>;
    };
    getRollData(): Record<string, any>;
    toObject(source?: boolean): Record<string, any>;
    update(data: Record<string, any>, options?: Record<string, any>): Promise<this | undefined>;
    createEmbeddedDocuments(
        embeddedName: string,
        data: Array<Record<string, any>>,
        operation?: Record<string, any>,
    ): Promise<any[]>;
    updateStat?(isWizard: boolean, offset: number): Promise<void>;
    resetStat?(isWizard: boolean): Promise<void>;
}

declare class Item {
    static DEFAULT_ICON: string;
    id: string;
    _id: string;
    name: string;
    img: string;
    type: string;
    isOwner: boolean;
    system: Record<string, any>;
    sheet: {
        render(force?: boolean | Record<string, any>): Promise<any>;
    };
    getRollData(): Record<string, any>;
    toObject(source?: boolean): Record<string, any>;
    update(data: Record<string, any>, options?: Record<string, any>): Promise<this | undefined>;
    delete(operation?: Record<string, any>): Promise<this | undefined>;
}

declare class Roll {
    formula: string;
    total: number;
    constructor(formula: string, data?: Record<string, any>, options?: Record<string, any>);
    evaluate(options?: Record<string, any>): Promise<this>;
}

declare class ChatMessage {
    static getSpeaker(options?: {
        scene?: any;
        actor?: Actor;
        token?: any;
        alias?: string;
    }): Record<string, any>;
    static create(
        data: Record<string, any> | Array<Record<string, any>>,
        operation?: Record<string, any>,
    ): Promise<ChatMessage | undefined>;
}

declare class RollTable {
    name: string;
    static create(
        data: Record<string, any> | Array<Record<string, any>>,
        operation?: Record<string, any>,
    ): Promise<RollTable | RollTable[] | undefined>;
    static createDocuments(
        data?: Array<Record<string, any>>,
        operation?: Record<string, any>,
    ): Promise<RollTable[]>;
}

declare const Hooks: {
    once(hook: string, fn: (...args: any[]) => any): number;
    on(hook: string, fn: (...args: any[]) => any): number;
};

declare const CONFIG: {
    Actor: {
        documentClass: typeof Actor;
        dataModels: Record<string, typeof foundry.abstract.TypeDataModel>;
    };
    Item: {
        documentClass?: typeof Item;
        dataModels: Record<string, typeof foundry.abstract.TypeDataModel>;
    };
    DEFINITELY_WIZARDS?: Record<string, any>;
    sounds: {
        dice: string;
    };
    debug: {
        hooks: boolean;
    };
};

declare const CONST: {
    CHAT_MESSAGE_STYLES: {
        OTHER: number;
        OOC: number;
        IC: number;
        EMOTE: number;
    };
    TABLE_RESULT_TYPES: {
        TEXT: string;
        DOCUMENT: string;
        COMPENDIUM: string;
    };
    DEFAULT_TOKEN: string;
};

declare const game: {
    version: string;
    user: {
        id: string;
        isGM: boolean;
    };
    i18n: {
        localize(key: string): string;
        format(key: string, data?: Record<string, any>): string;
    };
    actors: {
        get(id: string): DefinitelyWizardsActorLike | undefined;
    };
    tables: {
        contents: RollTable[];
        getName(name: string): RollTable | undefined;
    };
    collections: {
        get(name: string): { contents: any[] };
    };
};

interface DefinitelyWizardsActorLike extends Actor {
    updateStat(isWizard: boolean, offset: number): Promise<void>;
    resetStat(isWizard: boolean): Promise<void>;
}

declare const Handlebars: {
    registerHelper(name: string, fn: (...args: any[]) => any): void;
    SafeString: new (str: string) => any;
};
