const express = require('express');
const cors = require('cors');
require('dotenv').config();
const prisma = require('./prisma/client');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static front-end (simple pitch visualization)
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/users', require('./routes/users'));

app.get('/', (req, res) => {
  res.send('Football Manager API is running (PostgreSQL via Prisma)');
});

const PORT = process.env.PORT || 5000;

// Test DB Connection
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected successfully via Prisma');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
