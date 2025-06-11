import swaggerAutogen from 'swagger-autogen';
import path from 'path';

const doc = {
  info: {
    title: "Auth Service API",
    description: "Authentication Service API Documentation",
    version: "1.0.0"
  },
  host: "localhost:8000",
  schemes: ["http"],
};

const outputFile = path.join(__dirname, 'scalar-output.json');
const endpointsFiles = [path.join(__dirname, 'routes/auth.routes.ts')];

swaggerAutogen({
  openapi: "3.0.0",
  language: "en-US",
  autoHeaders: true,
  autoQuery: true,
  autoBody: true
})(outputFile, endpointsFiles, doc);
