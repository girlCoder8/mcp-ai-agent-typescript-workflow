// src/utils/db.ts
import { Client } from 'pg';
export const getDbClient = async () => {
    const client = new Client({
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DB,
        password: process.env.PG_PASS,
        port: Number(process.env.PG_PORT),
    });
    await client.connect();
    return client;
};
