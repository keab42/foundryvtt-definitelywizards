export namespace SystemTemplates {
  export type player_character = {
    coreStats: {
      wizard: number;
      wild: number;
    };
    playerClass: {
      value: string;
      description: string;
      customClassName: string;
    };
    playerProps: {
      prop1: {
        value: string;
        customPropName: string;
      };
      prop2: {
        value: string;
        customPropName: string;
      };
    };
    biography: string;
  };

  export interface PlayerCharacter extends player_character{};
}
