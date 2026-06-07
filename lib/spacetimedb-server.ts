import { DbConnection, tables } from '../src/module_bindings';
import WorldRow from '../src/module_bindings/world_table';
import NationRow from '../src/module_bindings/nation_table';
import type { Infer } from 'spacetimedb';

const HOST = process.env.SPACETIMEDB_HOST ?? 'wss://maincloud.spacetimedb.com';
const DB_NAME = process.env.SPACETIMEDB_DB_NAME ?? 'caravan-rsdsx';

export type WorldData = Infer<typeof WorldRow>;
export type NationData = Infer<typeof NationRow>;

export interface InitialSnapshot {
  world: WorldData | null;
}

export async function fetchSnapshot(): Promise<InitialSnapshot> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('SpacetimeDB connection timeout'));
    }, 10000);

    DbConnection.builder()
      .withUri(HOST)
      .withDatabaseName(DB_NAME)
      .onConnect((conn) => {
        conn
          .subscriptionBuilder()
          .onApplied(() => {
            clearTimeout(timeoutId);
            const worldRows = Array.from(conn.db.world.iter());
            conn.disconnect();
            resolve({ world: worldRows[0] ?? null });
          })
          .onError((ctx) => {
            clearTimeout(timeoutId);
            conn.disconnect();
            reject(ctx.event ?? new Error('Subscription error'));
          })
          .subscribe([tables.world]);
      })
      .onConnectError((_ctx, error) => {
        clearTimeout(timeoutId);
        reject(error);
      })
      .build();
  });
}
