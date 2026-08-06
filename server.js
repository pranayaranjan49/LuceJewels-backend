require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/authRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const userRoutes = require('./src/routes/userRoutes');
const campaignRoutes = require('./src/routes/campaignRoutes');

connectDB();

const app = express();

// --- Security & core middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(',') || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Global rate limiter (generic protection; auth routes have their own stricter limiter)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { success: false, message: 'Too many requests, please try again later' },
  })
);

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);

// --- Error handling ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Prevent silent crashes from unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});
