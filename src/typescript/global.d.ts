import { DEF_WIZ } from './helpers/config';

declare global {

  interface LenientGlobalVariableTypes {
    game: always;
    canvas: never;
  }

  interface AssumeHookRan {
    ready: always;
  }

  interface System {
    id: "definitely-wizards";
  }

  interface ReadyGame {
    def_wiz: Record<string, unknown>;
  }
  
  interface CONFIG {
    DEF_WIZ: any;
    DW: DEF_WIZ;
  }

}
