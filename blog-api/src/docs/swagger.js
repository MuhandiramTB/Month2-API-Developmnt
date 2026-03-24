const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog API',
      version: '1.0.0',
      description: `
A fully-featured RESTful Blog API built with Express.js and PostgreSQL.

## Features
- User registration and authentication (JWT)
- CRUD operations for posts with pagination & filtering
- Nested comments system
- Input validation
- Rate limiting
- Role-based access control

## Authentication
Use the **Authorize** button to set your JWT token.
Format: \`Bearer <your-token>\`
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Posts', description: 'Blog post operations' },
      { name: 'Comments', description: 'Comment operations' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
