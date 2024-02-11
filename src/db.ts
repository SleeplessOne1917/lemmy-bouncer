import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Database, verbose } from 'sqlite3';

let memoryDb: Database | undefined = undefined;

const sqlite = verbose();

const USER_ALLOWLIST_TABLE = 'user_allowlist';
const DB_FILE = process.env.DB_FILE;

const parallelize = (db: Database, callback: () => Promise<void>) =>
    new Promise<void>((resolve) => {
        db.parallelize(() => {
            callback().then(resolve);
        });
    });

const rowExists = (db: Database, id: number) =>
    new Promise<boolean>((resolve, reject) => {
        db.get(
            `SELECT id, reprocessTime FROM ${USER_ALLOWLIST_TABLE} WHERE id=?;`,
            id,
            (err, row: { reprocessTime: number }) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(!!row);
                }
            },
        );
    });

const upsert = (db: Database, id: number) =>
    new Promise<void>((resolve, reject) => {
        db.run(
            `INSERT INTO ${USER_ALLOWLIST_TABLE} (id) VALUES ($id) WHERE NOT EXISTS(SELECT 1 FROM ${USER_ALLOWLIST_TABLE} WHERE id=$id);`,
            {
                $id: id,
            },
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            },
        );
    });

export async function addToAllowList(ids: number[]) {
    await useDatabase(async (db) => {
        await parallelize(db, async () => {
            await Promise.allSettled(ids.map((id) => upsert(db, id)));
        });
    });
}

export async function isUserIdInAllowlist(id: number) {
    let exists = false;
    await useDatabase(async (db) => {
        exists = await rowExists(db, id);
    });

    return exists;
}

async function useDatabase(doStuffWithDB: (db: Database) => Promise<void>) {
    let db: Database;

    if (!DB_FILE) {
        if (memoryDb) {
            db = memoryDb;
        } else {
            memoryDb = new Database(':memory:');
            db = memoryDb;
        }
    } else {
        db = new sqlite.Database(DB_FILE);
    }

    await doStuffWithDB(db);

    if (DB_FILE) {
        db.close();
    }
}

export async function setupDB() {
    if (DB_FILE && !existsSync(DB_FILE)) {
        try {
            await mkdir(path.dirname(DB_FILE), { recursive: true });
            await writeFile(DB_FILE, '');
        } catch (error) {
            console.log('Error making database file: ' + error);

            process.exit(1);
        }
    }

    await useDatabase(async (db) => {
        db.serialize(() => {
            db.run(
                `CREATE TABLE IF NOT EXISTS user_allowlist (id INTEGER PRIMARY KEY) WITHOUT ROWID;`,
            );

            db.run(
                `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_allowlist_id ON user_allowlist (id);`,
            );
        });
    });
}
