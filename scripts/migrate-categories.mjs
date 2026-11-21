import mariadb from 'mariadb'

const url = process.env.DATABASE_URL
const parsed = new URL(url)

const conn = await mariadb.createConnection({
  host: parsed.hostname,
  port: parseInt(parsed.port) || 3306,
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ''),
  ssl: { rejectUnauthorized: false },
  connectTimeout: 20000,
  multipleStatements: false,
})

try {
  // 1. Convert category from ENUM to VARCHAR
  await conn.query(
    "ALTER TABLE interview_questions MODIFY COLUMN category VARCHAR(50) NOT NULL DEFAULT 'TECHNICAL'"
  )
  console.log('✓ Converted interview_questions.category to VARCHAR(50)')

  // 2. Create interview_categories table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS interview_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      color VARCHAR(20) NOT NULL DEFAULT 'blue',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_category (userId, name),
      INDEX idx_userId (userId),
      FOREIGN KEY (userId) REFERENCES \`User\`(id) ON DELETE CASCADE
    )
  `)
  console.log('✓ Created interview_categories table')

  // 3. Seed default categories for all existing users
  const users = await conn.query('SELECT id FROM `User`')
  const defaults = [
    ['TECHNICAL', 'blue'],
    ['BEHAVIORAL', 'amber'],
    ['SYSTEM_DESIGN', 'green'],
    ['CODING', 'red'],
    ['HR', 'slate'],
  ]
  for (const user of users) {
    for (const [name, color] of defaults) {
      await conn.query(
        'INSERT IGNORE INTO interview_categories (userId, name, color) VALUES (?, ?, ?)',
        [user.id, name, color]
      )
    }
  }
  console.log(`✓ Seeded default categories for ${users.length} user(s)`)
} finally {
  await conn.end()
}
