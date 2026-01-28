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

    // Hostname / FQDN
    if (request.hostname) config.hostname = request.hostname;
    if (request.fqdn) config.fqdn = request.fqdn;
    if (request.manageEtcHosts === 'true') config.manage_etc_hosts = true;
    if (request.manageEtcHosts === 'false') config.manage_etc_hosts = false;
    if (request.preserveHostname === 'true') config.preserve_hostname = true;
    if (request.preserveHostname === 'false') config.preserve_hostname = false;

    // Timezone
    if (request.timezone) config.timezone = request.timezone;

    // Locale
    if (request.locale) config.locale = request.locale;

    // Package update/upgrade
    if (request.packageUpdate) config.package_update = true;
    if (request.packageUpgrade) config.package_upgrade = true;
    if (request.packageRebootIfRequired) config.package_reboot_if_required = true;

    // SSH settings
    if (request.sshDisableRoot === 'true') config.disable_root = true;
    if (request.sshDisableRoot === 'false') config.disable_root = false;
    if (request.sshPwauth === 'true') config.ssh_pwauth = true;
    if (request.sshPwauth === 'false') config.ssh_pwauth = false;
    if (request.sshDeleteKeys) config.ssh_deletekeys = true;

    // Groups
    if (request.groups && request.groups.length > 0) {
        config.groups = [];
        for (const g of request.groups) {
            if (!g.name) continue;
            if (g.members) {
                const obj = {};
                obj[g.name] = g.members.split(',').map(m => m.trim());
                config.groups.push(obj);
            } else {
                config.groups.push(g.name);
            }
        }
        if (config.groups.length === 0) delete config.groups;
    }

    // Users
    if (request.users && request.users.length > 0) {
        config.users = ['default'];
        // Build a map of SSH keys per user
        const sshKeyMap = {};
        if (request.sshKeys && request.sshKeys.length > 0) {
            for (const k of request.sshKeys) {
                if (!k.username || !k.key) continue;
                if (!sshKeyMap[k.username]) sshKeyMap[k.username] = [];
                sshKeyMap[k.username].push(k.key);
            }
        }
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
            if (u.sudo) userEntry.sudo = u.sudo;
            if (sshKeyMap[u.username]) {
                userEntry.ssh_authorized_keys = sshKeyMap[u.username];
            }
            config.users.push(userEntry);
        }
    }

    // Yum repos
    const yumRepos = (request.repos || []).filter(r => r.name && r.baseurl && r.type !== 'apt');
    if (yumRepos.length > 0) {
        config.yum_repos = {};
        for (const r of yumRepos) {
            config.yum_repos[r.name] = {
                name: r.name,
                baseurl: r.baseurl,
                enabled: true,
                gpgcheck: r.gpgcheck !== 'false'
            };
            if (r.gpgkey) config.yum_repos[r.name].gpgkey = r.gpgkey;
        }
    }

    // Apt sources
    const aptRepos = (request.repos || []).filter(r => r.name && r.baseurl && r.type === 'apt');
    if (aptRepos.length > 0) {
        config.apt = { sources: {} };
        for (const r of aptRepos) {
            config.apt.sources[r.name] = {
                source: r.baseurl
            };
            if (r.gpgkey) config.apt.sources[r.name].key = r.gpgkey;
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

    // NTP
    if (request.ntpEnabled || request.ntpServers || request.ntpPools) {
        const ntpConfig = { enabled: !!request.ntpEnabled };
        if (request.ntpServers) {
            ntpConfig.servers = request.ntpServers.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (request.ntpPools) {
            ntpConfig.pools = request.ntpPools.split(',').map(s => s.trim()).filter(Boolean);
        }
        config.ntp = ntpConfig;
    }

    // DNS / resolv_conf
    if (request.dnsNameservers || request.dnsSearchdomains) {
        config.manage_resolv_conf = true;
        config.resolv_conf = {};
        if (request.dnsNameservers) {
            config.resolv_conf.nameservers = request.dnsNameservers.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (request.dnsSearchdomains) {
            config.resolv_conf.searchdomains = request.dnsSearchdomains.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    // Swap
    if (request.swapFilename || request.swapSize) {
        const swapConfig = {};
        if (request.swapFilename) swapConfig.filename = request.swapFilename;
        if (request.swapSize) swapConfig.size = request.swapSize;
        if (request.swapMaxsize) swapConfig.maxsize = request.swapMaxsize;
        config.swap = swapConfig;
    }

    // CA Certificates
    if (request.caCerts && request.caCerts.length > 0) {
        const trustedCerts = [];
        for (const c of request.caCerts) {
            if (!c.name || !c.content) continue;
            trustedCerts.push(c.content);
        }
        if (trustedCerts.length > 0) {
            config.ca_certs = { trusted: trustedCerts };
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

    // Write files (from user-defined entries + env vars + services)
    const writeFiles = [];

    // User-defined write_files
    if (request.writeFiles && request.writeFiles.length > 0) {
        for (const f of request.writeFiles) {
            if (!f.path || !f.content) continue;
            const entry = {
                path: f.path,
                content: f.content,
                permissions: f.permissions || '0644'
            };
            if (f.owner) entry.owner = f.owner;
            if (f.encoding && f.encoding !== 'text/plain') entry.encoding = f.encoding;
            writeFiles.push(entry);
        }
    }

    // Environment variables via write_files
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

    // Boot commands
    if (request.bootcmds && request.bootcmds.length > 0) {
        const bootcmd = [];
        for (const b of request.bootcmds) {
            if (b.command) bootcmd.push(b.command);
        }
        if (bootcmd.length > 0) config.bootcmd = bootcmd;
    }

    // Run commands (package cmds + mount/service cmds + user-defined)
    const userRuncmds = [];
    if (request.runcmds && request.runcmds.length > 0) {
        for (const r of request.runcmds) {
            if (r.command) userRuncmds.push(r.command);
        }
    }
    const allRuncmd = [...packageRuncmd, ...runcmd, ...userRuncmds];
    if (allRuncmd.length > 0) config.runcmd = allRuncmd;

    // Power state
    if (request.powerStateMode) {
        const ps = { mode: request.powerStateMode };
        if (request.powerStateDelay) ps.delay = request.powerStateDelay;
        if (request.powerStateMessage) ps.message = request.powerStateMessage;
        if (request.powerStateTimeout) ps.timeout = parseInt(request.powerStateTimeout, 10) || 30;
        if (request.powerStateCondition) ps.condition = request.powerStateCondition;
        config.power_state = ps;
    }

    // Final message
    if (request.finalMessage) {
        config.final_message = request.finalMessage;
    }

    // Phone home
    if (request.phoneHomeUrl) {
        const ph = { url: request.phoneHomeUrl };
        if (request.phoneHomeTries) ph.tries = parseInt(request.phoneHomeTries, 10) || 10;
        if (request.phoneHomePost) {
            ph.post = request.phoneHomePost === 'all' ? ['pub_key_dsa', 'pub_key_rsa', 'pub_key_ecdsa', 'pub_key_ed25519', 'instance_id', 'hostname', 'fqdn'] : [request.phoneHomePost];
        }
        config.phone_home = ph;
    }

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
