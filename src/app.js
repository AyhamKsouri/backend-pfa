require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { helmetMiddleware } = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// Trust proxy (critical in production when behind NGINX, Vercel, etc.)
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:4200', 'http://localhost:5000'];

// Middleware
app.use(helmetMiddleware);
app.use(globalLimiter);
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/projects', require('./modules/projects/projects.routes'));
app.use('/api/tasks', require('./modules/tasks/tasks.routes'));
app.use('/api/comments', require('./modules/comments/comments.routes'));
app.use('/api/members', require('./modules/members/members.routes'));
app.use('/api/schedule', require('./modules/schedule/schedule.routes'));
app.use(errorHandler);

module.exports = app;
