'use strict';
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Cách dùng: node scripts/hash-password.js "mat-khau-cua-ban"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nDán dòng này vào file .env:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
