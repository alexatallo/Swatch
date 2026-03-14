// This file runs before each test file
// Wait for database connection to be established
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

beforeAll(async () => {
  // Give the server time to connect to MongoDB
  await delay(2000);
});

afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(() => resolve(), 500));
});
