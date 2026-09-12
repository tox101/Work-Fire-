import fs from 'node:fs';
import mysql from 'mysql2/promise';
const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match) env[match[1]] = match[2]; }
const connection = await mysql.createConnection({ uri: env.DATABASE_URL, connectTimeout: 10000, ssl: { rejectUnauthorized: true } });
const [rows] = await connection.query("SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'schedules' ORDER BY ORDINAL_POSITION");
console.log(JSON.stringify(rows, null, 2));
await connection.end();
