// Seed script for TiDB Cloud production database
// Run: DATABASE_URL="mysql://..." node scripts/seed-prod.mjs

import mariadb from 'mariadb'
import bcrypt from 'bcryptjs'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Set DATABASE_URL env var first')
  process.exit(1)
}

const parsed = new URL(url)

const pool = mariadb.createPool({
  host: parsed.hostname,
  port: parseInt(parsed.port) || 3306,
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ''),
  connectionLimit: 2,
  connectTimeout: 20000,
  ssl: { rejectUnauthorized: false },
})

const ADMIN_EMAIL = 'admin@pgcip.com'
const ADMIN_PASSWORD = 'Admin@123'
const ADMIN_NAME = 'Admin'

async function seed() {
  const conn = await pool.getConnection()
  try {
    // Check if admin already exists
    const rows = await conn.query('SELECT id FROM User WHERE email = ?', [ADMIN_EMAIL])
    if (rows.length > 0) {
      console.log('Admin user already exists, skipping.')
      return
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
    await conn.query(
      'INSERT INTO User (email, password, isAdmin, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [ADMIN_EMAIL, hash, 1]
    )
    console.log(`Created admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  } finally {
    conn.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
