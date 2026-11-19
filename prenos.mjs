import 'dotenv/config';
import pg from 'pg';

// Přístupy se čtou z .env (OLD_DATABASE_URL = zdroj, NEW_DATABASE_URL = cíl).
// Nikdy je nepiš přímo do kódu.
const { OLD_DATABASE_URL, NEW_DATABASE_URL } = process.env;
if (!OLD_DATABASE_URL || !NEW_DATABASE_URL) {
  console.error('Chybí OLD_DATABASE_URL nebo NEW_DATABASE_URL v .env');
  process.exit(1);
}

const oldDb = new pg.Pool({
  connectionString: OLD_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const newDb = new pg.Pool({
  connectionString: NEW_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Pripojuji k databazim...');
  const oldClient = await oldDb.connect();
  console.log('Pripojeno k Railway!');
  const newClient = await newDb.connect();
  console.log('Pripojeno k Neonu!');

  try {
    const { rows: tables } = await oldClient.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
    `);

    await newClient.query('SET session_replication_role = replica;');

    for (const { tablename } of tables) {
      console.log(`Kopiruji tabulku: ${tablename}...`);
      const { rows } = await oldClient.query(`SELECT * FROM "${tablename}"`);
      if (rows.length === 0) {
        console.log(`  -> Tabulka ${tablename} je prazdna.`);
        continue;
      }

      const cols = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
      for (const row of rows) {
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        await newClient.query(
          `INSERT INTO "${tablename}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      }
      console.log(`  -> Tabulka ${tablename}: preneseno ${rows.length} zaznamu.`);
    }

    await newClient.query('SET session_replication_role = DEFAULT;');
    console.log('HOTOVO! Vsechna data jsou uspesne v Neonu.');
  } catch (err) {
    console.error('Chyba prenosu:', err);
  } finally {
    oldClient.release();
    newClient.release();
    await oldDb.end();
    await newDb.end();
  }
}

main();
