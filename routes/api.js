const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const yaml = require('js-yaml');

const authConfig = require('../config/auth');
const authMiddleware = require('../middleware/auth');

const DATA_DIR = path.join(__dirname, '..', 'data', 'requests');

// Helper: Read all requests
function getAllRequests() {
    if (!fs.existsSync(DATA_DIR)) {
        return [];
    }
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    return files.map(file => {
        const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
        return JSON.parse(content);
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Helper: Read single request
function getRequest(id) {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Helper: Save request
function saveRequest(data) {
    const filePath = path.join(DATA_DIR, `${data.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Helper: Delete request
function deleteRequest(id) {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
}

// Login
router.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === authConfig.password) {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check auth status
router.get('/auth/status', (req, res) => {
    res.json({ authenticated: !!req.session.authenticated });
});

// Get all requests
router.get('/requests', authMiddleware, (req, res) => {
    const requests = getAllRequests();
    res.json(requests);
});

// Create new request
router.post('/requests', authMiddleware, (req, res) => {
    const data = req.body;
    data.id = uuidv4();
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    data.status = 'pending';

    saveRequest(data);
    res.status(201).json(data);
});

// Get single request
router.get('/requests/:id', authMiddleware, (req, res) => {
    const request = getRequest(req.params.id);
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    res.json(request);
});

// Update request
router.put('/requests/:id', authMiddleware, (req, res) => {
    const existing = getRequest(req.params.id);
    if (!existing) {
        return res.status(404).json({ error: 'Request not found' });
    }

    const data = {
        ...existing,
        ...req.body,
        id: req.params.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
    };

    saveRequest(data);
    res.json(data);
});

// Delete request
router.delete('/requests/:id', authMiddleware, (req, res) => {
    if (deleteRequest(req.params.id)) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Request not found' });
    }
});

// Export request
router.get('/requests/:id/export', authMiddleware, (req, res) => {
    const request = getRequest(req.params.id);
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }

    const format = req.query.format || 'json';
    const filename = `${request.appName || 'app'}-setup-${request.id.slice(0, 8)}`;

    // Remove internal fields for export
    const exportData = { ...request };
    delete exportData.id;
    delete exportData.createdAt;
    delete exportData.updatedAt;
    delete exportData.status;

    if (format === 'yaml') {
        res.setHeader('Content-Type', 'text/yaml');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.yaml"`);
        res.send(yaml.dump(exportData));
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.send(JSON.stringify(exportData, null, 2));
    }
});

// Update request status
router.patch('/requests/:id/status', authMiddleware, (req, res) => {
    const existing = getRequest(req.params.id);
    if (!existing) {
        return res.status(404).json({ error: 'Request not found' });
    }

    existing.status = req.body.status;
    existing.updatedAt = new Date().toISOString();
    saveRequest(existing);
    res.json(existing);
});

module.exports = router;
