module.exports = function authMiddleware(req, res, next) {
    if (req.session.authenticated) {
        return next();
    }

    // For API requests, return 401
    if (req.path.startsWith('/api')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // For page requests, redirect to login
    res.redirect('/login');
};
