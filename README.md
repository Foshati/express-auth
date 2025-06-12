# Auth Service

This is an authentication service for Digifa, built with Node.js, Express, Prisma, and TypeScript.

## Features

- User registration and login
- Email verification with OTP
- Password reset
- JWT authentication
- Rate limiting and security middleware
- Redis integration for OTP and session management

## Getting Started

### Prerequisites

- Node.js v22+
- npm
- PostgreSQL (or your preferred database)

### Installation

1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd auth-service
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up your environment variables in a `.env` file (see `.env.example`).
4. Run database migrations:
   ```sh
   npx prisma migrate dev
   ```
5. Start the development server:
   ```sh
   npm run dev
   ```

## Scripts

- `npm run dev` — Start the server in development mode
- `npm run build` — Build the project
- `npm start` — Run the built project
- `npm test` — Run tests

## Testing

This project uses Jest for testing. To run tests:

```sh
npm test
```

## License

MIT
