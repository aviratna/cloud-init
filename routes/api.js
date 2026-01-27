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

// Generate cloud-init cloud-config
router.get('/requests/:id/cloud-config', authMiddleware, (req, res) => {
    const request = getRequest(req.params.id);
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }

    const cloudConfig = buildCloudConfig(request);
    const filename = `${request.appName || 'app'}-cloud-config`;

    const format = req.query.format || 'download';
    const output = '#cloud-config\n' + yaml.dump(cloudConfig, { lineWidth: -1 });

    if (format === 'preview') {
        res.setHeader('Content-Type', 'text/plain');
        res.send(output);
    } else {
        res.setHeader('Content-Type', 'text/yaml');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.yaml"`);
        res.send(output);
    }
});

function buildCloudConfig(request) {
    const config = {};

    // Users
    if (request.users && request.users.length > 0) {
        config.users = ['default'];
        for (const u of request.users) {
            if (!u.username) continue;
            const userEntry = {
                name: u.username,
                shell: u.shell || '/bin/bash',
                lock_passwd: false
            };
            if (u.uid) userEntry.uid = u.uid;
            if (u.groups) userEntry.groups = u.groups;
            if (u.homeDir) userEntry.homedir = u.homeDir;
            config.users.push(userEntry);
        }
    }

    // Packages
    const packages = [];
    if (request.packages && request.packages.length > 0) {
        for (const p of request.packages) {
            if (!p.name) continue;
            if (p.action === 'install' || !p.action) {
                packages.push(p.version ? `${p.name}-${p.version}` : p.name);
            }
        }
    }
    if (request.nfsMounts && request.nfsMounts.length > 0) {
        if (!packages.includes('nfs-common') && !packages.includes('nfs-utils')) {
            packages.push('nfs-common');
        }
    }
    if (packages.length > 0) {
        config.packages = packages;
    }

    // Package removal/update via runcmd
    const packageRuncmd = [];
    if (request.packages && request.packages.length > 0) {
        for (const p of request.packages) {
            if (!p.name) continue;
            if (p.action === 'remove') {
                packageRuncmd.push(`yum remove -y ${p.name} 2>/dev/null || apt-get remove -y ${p.name}`);
            } else if (p.action === 'update') {
                packageRuncmd.push(`yum update -y ${p.name} 2>/dev/null || apt-get install --only-upgrade -y ${p.name}`);
            }
        }
    }

    // Mount points & NFS mounts via disk_setup, fs_setup, and mounts
    const mounts = [];
    const fsSetup = [];
    const runcmd = [];

    // Local mount points
    if (request.mounts && request.mounts.length > 0) {
        for (const m of request.mounts) {
            if (!m.path) continue;
            runcmd.push(`mkdir -p ${m.path}`);
            // Add fs_setup entry if size is specified
            if (m.size) {
                fsSetup.push({
                    filesystem: m.fsType || 'ext4',
                    label: m.path.replace(/\//g, '_').replace(/^_/, ''),
                    device: 'ephemeral0',
                    partition: 'auto',
                    overwrite: false
                });
            }
        }
    }

    // NFS mounts
    if (request.nfsMounts && request.nfsMounts.length > 0) {
        for (const n of request.nfsMounts) {
            if (!n.server || !n.exportPath || !n.localPath) continue;
            runcmd.push(`mkdir -p ${n.localPath}`);
            mounts.push([
                `${n.server}:${n.exportPath}`,
                n.localPath,
                'nfs',
                n.options || 'defaults',
                '0',
                '0'
            ]);
        }
    }

    if (mounts.length > 0) config.mounts = mounts;
    if (fsSetup.length > 0) config.fs_setup = fsSetup;

    // Environment variables via write_files
    const writeFiles = [];
    if (request.envVars && request.envVars.length > 0) {
        const userVars = request.envVars.filter(e => e.name && e.scope === 'user');
        const systemVars = request.envVars.filter(e => e.name && e.scope === 'system');

        if (systemVars.length > 0) {
            const content = systemVars.map(e => `${e.name}="${e.value}"`).join('\n') + '\n';
            writeFiles.push({
                path: `/etc/profile.d/${request.appName || 'app'}-env.sh`,
                content: content,
                permissions: '0644'
            });
        }

        if (userVars.length > 0 && request.users && request.users.length > 0) {
            for (const u of request.users) {
                if (!u.username) continue;
                const homeDir = u.homeDir || `/home/${u.username}`;
                const content = userVars.map(e => `export ${e.name}="${e.value}"`).join('\n') + '\n';
                writeFiles.push({
                    path: `${homeDir}/.app_env`,
                    content: content,
                    owner: `${u.username}:${u.username}`,
                    permissions: '0644',
                    append: true
                });
                runcmd.push(`grep -q '.app_env' ${homeDir}/.bashrc || echo '. ${homeDir}/.app_env' >> ${homeDir}/.bashrc`);
            }
        }
    }

    // Service startup scripts
    if (request.services && request.services.length > 0) {
        for (const s of request.services) {
            if (!s.name) continue;

            // Create systemd service unit
            const serviceUnit = [
                '[Unit]',
                `Description=${s.name} service`,
                'After=network.target',
                '',
                '[Service]',
                'Type=simple',
                `ExecStart=${s.startCmd || '/bin/true'}`,
                s.stopCmd ? `ExecStop=${s.stopCmd}` : '',
                s.restartCmd ? `ExecReload=${s.restartCmd}` : '',
                'Restart=on-failure',
                '',
                '[Install]',
                'WantedBy=multi-user.target'
            ].filter(Boolean).join('\n') + '\n';

            writeFiles.push({
                path: `/etc/systemd/system/${s.name}.service`,
                content: serviceUnit,
                permissions: '0644'
            });

            runcmd.push(`systemctl daemon-reload`);
            runcmd.push(`systemctl enable ${s.name}`);
            runcmd.push(`systemctl start ${s.name}`);

            // Health check script
            if (s.healthCheck) {
                writeFiles.push({
                    path: `/usr/local/bin/${s.name}-healthcheck.sh`,
                    content: `#!/bin/bash\n${s.healthCheck}\n`,
                    permissions: '0755'
                });
            }
        }
    }

    if (writeFiles.length > 0) config.write_files = writeFiles;
    const allRuncmd = [...packageRuncmd, ...runcmd];
    if (allRuncmd.length > 0) config.runcmd = allRuncmd;

    return config;
}

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
