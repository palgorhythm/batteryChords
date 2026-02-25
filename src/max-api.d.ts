declare module "max-api" {
  export const MESSAGE_TYPES: {
    ALL: string;
    BANG: string;
    DICT: string;
    LIST: string;
    NUMBER: string;
  };

  export function post(...args: unknown[]): void;
  export function outlet(...args: unknown[]): void;
  export function outletBang(): void;
  export function addHandler(name: string, handler: (...args: any[]) => void): void;
  export function addHandlers(handlers: Record<string, (...args: any[]) => void>): void;
  export function getDict(name: string): Promise<Record<string, unknown>>;
  export function setDict(name: string, data: Record<string, unknown>): Promise<void>;
  export function updateDict(name: string, key: string, value: unknown): Promise<void>;

  const Max: {
    MESSAGE_TYPES: typeof MESSAGE_TYPES;
    post: typeof post;
    outlet: typeof outlet;
    outletBang: typeof outletBang;
    addHandler: typeof addHandler;
    addHandlers: typeof addHandlers;
    getDict: typeof getDict;
    setDict: typeof setDict;
    updateDict: typeof updateDict;
  };

  export default Max;
}
