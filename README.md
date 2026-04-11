# Backend API

## Tech Stack
- Express
- Prisma
- PostgreSQL
- Cors
- Helmet
- Morgan
- Dotenv
- Nodemon

## Project Structure
- `prisma/`: Prisma schema and migrations
- `src/`: Main application code
  - `config/`: Configuration files
  - `modules/`: Feature modules
  - `middleware/`: Custom Express middlewares
  - `utils/`: Utility functions
  - `routes/`: API route definitions
  - `app.js`: Express application setup
  - `server.js`: Server entry point
- `tests/`: Test suites

## Scripts
- `npm run dev`: Start the development server with nodemon
- `npm start`: Start the production server
- `npx prisma generate`: Generate Prisma client
- `npx prisma migrate dev`: Run Prisma migrations
