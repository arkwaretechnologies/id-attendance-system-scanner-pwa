declare module 'idb' {
  export interface IDBPTransaction {
    store: { put(value: unknown): Promise<void>; clear(): Promise<void> };
    done: Promise<void>;
  }
  export interface IDBPDatabase<DB = unknown> {
    get(storeName: string, key: string): Promise<unknown>;
    put(storeName: string, value: unknown): Promise<void>;
    delete(storeName: string, key: string): Promise<void>;
    getAll(storeName: string): Promise<unknown[]>;
    getAllFromIndex(storeName: string, indexName: string, key?: unknown): Promise<unknown[]>;
    transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBPTransaction;
    objectStoreNames: DOMStringList;
    createObjectStore(name: string, options?: { keyPath?: string }): { createIndex(name: string, keyPath: string, options?: { unique?: boolean }): void };
  }
  export function openDB<DB = unknown>(
    name: string,
    version: number,
    options?: { upgrade?(database: IDBPDatabase<DB>): void }
  ): Promise<IDBPDatabase<DB>>;
}
