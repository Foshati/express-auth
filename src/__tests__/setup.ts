import { prisma } from '../libs/prisma';

// Set test environment
process.env.NODE_ENV = 'test';

// Clean up database before all tests
beforeAll(async () => {
  await prisma.user.deleteMany();
});

// Clean up database after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Add a basic test to satisfy Jest
describe('Setup', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
