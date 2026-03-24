const bcrypt = require('bcryptjs');
const { pool } = require('./connection');

const seedData = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing data (in reverse dependency order)
    await client.query('DELETE FROM comments');
    await client.query('DELETE FROM posts');
    await client.query('DELETE FROM users');

    // Reset sequences
    await client.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE posts_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE comments_id_seq RESTART WITH 1");

    // ========================
    // SEED USERS
    // ========================
    const passwordHash = await bcrypt.hash('password123', 10);

    const usersResult = await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, bio, role)
      VALUES
        ('admin',    'admin@blog.com',    $1, 'Admin User',    'Blog administrator',                       'admin'),
        ('john_doe', 'john@example.com',  $1, 'John Doe',      'Full-stack developer and tech writer',     'user'),
        ('jane_smith','jane@example.com', $1, 'Jane Smith',    'UX designer passionate about clean UI',    'user'),
        ('bob_dev',  'bob@example.com',   $1, 'Bob Developer', 'Backend engineer focused on scalability',  'user'),
        ('alice_w',  'alice@example.com', $1, 'Alice Writer',  'Technical content creator',                'user')
      RETURNING id;
    `, [passwordHash]);

    const userIds = usersResult.rows.map(r => r.id);
    console.log(`✅ Seeded ${userIds.length} users (password: password123)`);

    // ========================
    // SEED POSTS
    // ========================
    const postsResult = await client.query(`
      INSERT INTO posts (title, slug, content, excerpt, status, author_id, tags)
      VALUES
        ('Getting Started with Node.js',
         'getting-started-with-nodejs',
         'Node.js is a powerful JavaScript runtime built on Chrome V8 engine. In this guide, we will explore the fundamentals of building server-side applications with Node.js. We will cover modules, the event loop, and how to create your first HTTP server.',
         'A beginner-friendly guide to Node.js fundamentals',
         'published', $1, ARRAY['nodejs','javascript','backend']),

        ('REST API Design Best Practices',
         'rest-api-design-best-practices',
         'Designing a good REST API is crucial for building scalable web services. This post covers resource naming, HTTP methods, status codes, versioning, pagination, and error handling patterns that every API developer should know.',
         'Learn how to design clean and maintainable REST APIs',
         'published', $2, ARRAY['api','rest','design']),

        ('PostgreSQL for Beginners',
         'postgresql-for-beginners',
         'PostgreSQL is a powerful open-source relational database. This tutorial covers installation, basic SQL commands, data types, relationships, indexes, and common query patterns to get you started with production-grade databases.',
         'A comprehensive introduction to PostgreSQL',
         'published', $3, ARRAY['postgresql','database','sql']),

        ('Authentication with JWT',
         'authentication-with-jwt',
         'JSON Web Tokens provide a stateless authentication mechanism. Learn how JWTs work, how to implement token-based auth in Express.js, and best practices for token storage, refresh strategies, and security considerations.',
         'Implement secure authentication using JSON Web Tokens',
         'published', $1, ARRAY['jwt','authentication','security']),

        ('Express.js Middleware Deep Dive',
         'expressjs-middleware-deep-dive',
         'Middleware is the backbone of Express.js applications. This post explores how middleware works, the request-response cycle, custom middleware creation, error-handling middleware, and third-party middleware you should know about.',
         'Understanding Express.js middleware from the ground up',
         'published', $4, ARRAY['expressjs','middleware','nodejs']),

        ('Docker for Node.js Apps',
         'docker-for-nodejs-apps',
         'Containerizing your Node.js application with Docker ensures consistent environments across development, testing, and production. We cover Dockerfile best practices, multi-stage builds, and docker-compose for development.',
         'Containerize your Node.js applications with Docker',
         'draft', $2, ARRAY['docker','nodejs','devops']),

        ('Testing APIs with Jest',
         'testing-apis-with-jest',
         'Automated testing is essential for API reliability. This guide covers unit testing, integration testing with supertest, mocking database connections, and setting up CI pipelines for your Express.js API tests.',
         'Complete guide to testing Express.js APIs',
         'published', $5, ARRAY['testing','jest','api'])
      RETURNING id;
    `, [userIds[1], userIds[2], userIds[3], userIds[0], userIds[4]]);

    const postIds = postsResult.rows.map(r => r.id);
    console.log(`✅ Seeded ${postIds.length} posts`);

    // ========================
    // SEED COMMENTS
    // ========================
    await client.query(`
      INSERT INTO comments (content, post_id, author_id, parent_id)
      VALUES
        ('Great introduction! Very helpful for beginners.', $1, $6, NULL),
        ('Thanks for sharing these best practices!',        $2, $7, NULL),
        ('I have been using PostgreSQL for years, solid guide.', $3, $8, NULL),
        ('JWT security tips were exactly what I needed.',    $4, $9, NULL),
        ('Could you add more examples about custom middleware?', $5, $10, NULL),
        ('Thanks! I will add more examples in a follow-up post.', $5, $11, 5),
        ('This helped me set up my first API.',             $1, $12, NULL),
        ('The pagination section was particularly useful.',  $2, $13, NULL),
        ('How does this compare to MongoDB?',               $3, $14, NULL),
        ('Excellent coverage of refresh tokens!',           $4, $15, NULL)
    `, [
      postIds[0], postIds[1], postIds[2], postIds[3], postIds[4],
      postIds[4],
      postIds[0], postIds[1], postIds[2], postIds[3],
      userIds[2], userIds[3], userIds[4], userIds[0], userIds[1],
    ]);
    console.log('✅ Seeded 10 comments');

    await client.query('COMMIT');
    console.log('\n🎉 Seed data inserted successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seedData().catch(() => process.exit(1));
