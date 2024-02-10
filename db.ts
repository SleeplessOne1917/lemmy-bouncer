import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Database, verbose } from 'sqlite3';

let memoryDb: Database | undefined = undefined;

const sqlite = verbose();

const USER_ALLOWLIST_TABLE = 'user_allowlist';

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

export async function isUserIdInAllowlist(id: number) {
    let exists = false;
    await useDatabase(async (db) => {
        exists = await rowExists(db, id);
    });

    return exists;
}

async function useDatabase(
    doStuffWithDB: (db: Database) => Promise<void>,
    dbPath?: string,
) {
    let db: Database;

    if (!dbPath) {
        if (memoryDb) {
            db = memoryDb;
        } else {
            memoryDb = new Database(':memory:');
            db = memoryDb;
        }
    } else {
        db = new sqlite.Database(dbPath);
    }

    await doStuffWithDB(db);

    if (dbPath) {
        db.close();
    }
}

export async function setupDB(dbPath?: string) {
    if (dbPath && !existsSync(dbPath)) {
        try {
            await mkdir(path.dirname(dbPath), { recursive: true });
            await writeFile(dbPath, '');
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
    }, dbPath);
}
