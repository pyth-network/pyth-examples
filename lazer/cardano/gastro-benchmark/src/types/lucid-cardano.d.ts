declare module "lucid-cardano" {
  export const Data: any & {
    Object: (...args: any[]) => any;
    Bytes: (...args: any[]) => any;
    Integer: (...args: any[]) => any;
    Static: any;
    to: (...args: any[]) => any;
    void: () => any;
  };
  export const Constr: any;
  export const fromText: any;
  export class Blockfrost {
    constructor(url: string, key: string);
  }
  export class Lucid {
    static new(provider: unknown, network: string): Promise<any>;
  }
  export type Script = any;
}
