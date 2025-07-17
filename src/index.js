const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');

// Import routes
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const quizRoutes = require('./routes/quizRoutes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection string - use environment variable for production
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webquiz';

// Connect to MongoDB with retry logic
const connectWithRetry = () => {
  console.log('Attempting to connect to MongoDB...');
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

connectWithRetry();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configure session
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'quizappsecret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true
  }
};

// Use MongoDB store for sessions in production
if (process.env.NODE_ENV === 'production') {
  sessionConfig.store = MongoStore.create({ 
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions' 
  });
}

app.use(session(sessionConfig));

// Set view engine
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Routes
app.use('/teacher', teacherRoutes);
app.use('/student', studentRoutes);
app.use('/quiz', quizRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { error: 'Trang không tồn tại' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: 'Đã xảy ra lỗi trên máy chủ' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;