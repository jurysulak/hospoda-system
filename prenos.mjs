import pg from 'pg';

const oldDb = new pg.Pool({
  connectionString: 'postgresql://postgres:OnsBtVOvJhyBHthGxWjjluGYxBGOaBwY@switchback.proxy.rlwy.net:40291/railway',
  ssl: { rejectUnauthorized: false }
});

const newDb = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_2In9jJOxDeBL@ep-fragrant-term-bau4io48.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require',
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
