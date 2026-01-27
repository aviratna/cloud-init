const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const authConfig = require('./config/auth');
const authMiddleware = require('./middleware/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data', 'requests');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Trust proxy (required for Render, Heroku, etc.)
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    secret: process.env.SESSION_SECRET || 'app-setup-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// API routes
app.use('/api', apiRoutes);

// View routes
app.get('/login', (req, res) => {
    if (req.session.authenticated) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/new', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

app.get('/edit/:id', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

app.get('/view/:id', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'view.html'));
});

// Redirect unknown routes to dashboard
app.get('*', (req, res) => {
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`App Setup Portal running at http://localhost:${PORT}`);
    console.log(`Default password: ${authConfig.password}`);
});
