/**
 * npm run seed             -> reset + insert demo data into MONGODB_URI
 * npm run seed:preview     -> print what would be created (no database needed)
 */
import path from 'path';
import dotenv from 'dotenv';
import { connectDb } from '../config/db';
import { generateDemoDataset, summarizeDataset } from './demoDataset';
import { persistDemoDataset } from './persist';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const ds = generateDemoDataset();
  const summary = summarizeDataset(ds);
  console.log('Simulated campaign data (NOT real results):');
  console.log(JSON.stringify(summary, null, 2));
  if (process.argv.includes('--dry-run')) return console.log('\nDry run: nothing written.');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set (see .env.example)');
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--allow-production')) {
    throw new Error('Refusing to seed with NODE_ENV=production (pass --allow-production to override).');
  }
  await connectDb(uri);
  const result = await persistDemoDataset(ds);
  console.log('\nSeeded (previous demo records were replaced):', result);
  process.exit(0);
}
main().catch((err) => { console.error('[seed failed]', err instanceof Error ? err.message : err); process.exit(1); });
