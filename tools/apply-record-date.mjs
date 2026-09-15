import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL is not configured; skipping recordDate migration");
  process.exit(0);
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  try {
    await connection.query("ALTER TABLE `records` ADD COLUMN `recordDate` timestamp NULL");
    console.log("recordDate column added");
  } catch (error) {
    if (error?.code === "ER_DUP_FIELDNAME" || error?.errno === 1060) console.log("recordDate column already exists");
    else throw error;
  }
  try {
    await connection.query("CREATE INDEX `records_user_record_date_idx` ON `records` (`userId`,`recordDate`)");
    console.log("recordDate index added");
  } catch (error) {
    if (error?.code === "ER_DUP_KEYNAME" || error?.errno === 1061) console.log("recordDate index already exists");
    else throw error;
  }
} finally {
  await connection.end();
}
