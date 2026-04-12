const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PFA Project Management API',
      version: '1.0.0',
      description: 'API Documentation for the PFA Backend system',
    },
    servers: [
      {
        url: process.env.APP_URL || 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
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
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
