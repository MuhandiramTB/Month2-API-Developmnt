const { pool } = require('./connection');

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ========================
    // USERS TABLE
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(50)  UNIQUE NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name     VARCHAR(100),
        bio           TEXT,
        avatar_url    VARCHAR(500),
        role          VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // ========================
    // POSTS TABLE
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id            SERIAL PRIMARY KEY,
        title         VARCHAR(255) NOT NULL,
        slug          VARCHAR(300) UNIQUE NOT NULL,
        content       TEXT         NOT NULL,
        excerpt       VARCHAR(500),
        status        VARCHAR(20)  DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        author_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tags          TEXT[],
        created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Posts table created');

    // ========================
    // COMMENTS TABLE
    // ========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id            SERIAL PRIMARY KEY,
        content       TEXT    NOT NULL,
        post_id       INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        author_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id     INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Comments table created');

    // ========================
    // INDEXES for performance
    // ========================
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_author    ON posts(author_id);
      CREATE INDEX IF NOT EXISTS idx_posts_status    ON posts(status);
      CREATE INDEX IF NOT EXISTS idx_posts_slug      ON posts(slug);
      CREATE INDEX IF NOT EXISTS idx_posts_created   ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_post   ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
    `);
    console.log('✅ Indexes created');

    // ========================
    // UPDATED_AT TRIGGER FUNCTION
    // ========================
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Apply trigger to each table
    const tables = ['users', 'posts', 'comments'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    console.log('✅ Triggers created');

    await client.query('COMMIT');
    console.log('\n🎉 Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

createTables().catch(() => process.exit(1));
