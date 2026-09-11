declare module "node:sqlite" {
  export type StatementResultingChanges = {
    changes: number;
    lastInsertRowid: number | bigint;
  };

  export class StatementSync {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): StatementResultingChanges;
  }

  export type DatabaseSyncOptions = {
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
  };

  export class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }
}
