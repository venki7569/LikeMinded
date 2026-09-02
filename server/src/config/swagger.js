import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import env from './env.js';

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'LikeMinded API',
    version: '1.0.0',
    description:
      'REST API for LikeMinded — an AI-powered social network that connects people by ' +
      'interests, skills and goals.',
    license: { name: 'MIT' },
  },
  servers: [{ url: `http://localhost:${env.PORT}${env.API_PREFIX}`, description: 'Local' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'body.email' },
                message: { type: 'string', example: 'Enter a valid email address' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '665f1c4e8b1f4c0012a3b456' },
          name: { type: 'string', example: 'Ada Lovelace' },
          username: { type: 'string', example: 'ada' },
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          role: { type: 'string', enum: ['user', 'moderator', 'admin'] },
          bio: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          interests: { type: 'array', items: { type: 'string' } },
          isEmailVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  tags: [
    { name: 'System', description: 'Health and diagnostics' },
    { name: 'Auth', description: 'Registration, sessions and password management' },
    { name: 'Profiles', description: 'Public and owner-facing user profiles' },
    { name: 'Connections', description: 'Friend requests, accepted connections, and blocking' },
    { name: 'People', description: 'User discovery (Mongo filters; AI ranking arrives in Phase 9)' },
  ],
};

export const openApiSpec = swaggerJsdoc({
  definition,
  apis: ['./src/routes/*.js'],
});

export function mountSwagger(app) {
  app.get('/api-docs.json', (_req, res) => res.json(openApiSpec));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'LikeMinded API Reference',
      swaggerOptions: { persistAuthorization: true },
    })
  );
}

export default mountSwagger;
