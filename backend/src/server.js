const express = require('express');
const dotenv = require('dotenv');

// Load env vars immediately
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const arcadeRoutes = require('./routes/arcadeRoutes');
const songRoutes = require('./routes/songRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const userRoutes = require('./routes/userRoutes');
const setupSecurity = require('./middleware/security');
const logger = require('./utils/logger');

// Connect to database
connectDB();

const app = express();

// Setup Security Headers
setupSecurity(app);

const { globalLimiter } = require('./middleware/rateLimiter');
app.use(globalLimiter);

// Enable CORS
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/arcades', arcadeRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/scores', scoreRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ message: 'Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
