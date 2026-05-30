// Loaded before tsx/cjs registers TypeScript files so that DB_PATH and NODE_ENV
// are in place when database.ts is first imported (it captures DB_PATH at module load).
const path = require('path');
process.env.NODE_ENV = 'test';
process.env.DB_PATH  = path.join(__dirname, '../data/test.db');
