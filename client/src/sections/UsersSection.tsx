import { useStore } from '../store'
import { Button, Card, InfoBanner, Input, SectionHeader, Textarea, Toggle } from '../components/ui'

export function UsersSection() {
  const {
    enabledSections, users,
    toggleSection, addUser, updateUser, removeUser, resetUsers,
  } = useStore()
  const enabled = enabledSections.users

  return (
    <section>
      <SectionHeader title="Users & Groups" icon="👥" enabled={enabled} onToggle={() => toggleSection('users')} onReset={resetUsers} />
      <InfoBanner>
        Creates OS users via the <code className="bg-slate-800 px-1 rounded">users</code> module. SSH keys are injected into
        <code className="bg-slate-800 px-1 rounded">~/.ssh/authorized_keys</code>.
        Use <strong>lock_passwd: true</strong> for service accounts to prevent password login.
        Users are added after the default cloud user (ec2-user/centos).
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <>
          <div className="space-y-3">
            {users.map((u, idx) => (
              <Card key={u.id}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">User {idx + 1}{u.name && ` — ${u.name}`}</span>
                  <Button variant="danger" size="sm" type="button" onClick={() => removeUser(u.id)}>Remove</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Username"
                    value={u.name}
                    onChange={(e) => updateUser(u.id, { name: e.target.value })}
                    placeholder="appuser"
                  />
                  <Input
                    label="Shell"
                    value={u.shell}
                    onChange={(e) => updateUser(u.id, { shell: e.target.value })}
                    placeholder="/bin/bash"
                  />
                  <Input
                    label="Groups (comma-separated)"
                    value={u.groups}
                    onChange={(e) => updateUser(u.id, { groups: e.target.value })}
                    placeholder="wheel,docker"
                    tooltip="User will be added to these supplementary groups."
                  />
                  <div className="flex flex-col gap-3 justify-end pb-1">
                    <Toggle
                      label="Grant sudo access"
                      checked={u.sudo}
                      onChange={(v) => updateUser(u.id, { sudo: v })}
                      tooltip="Adds NOPASSWD sudo rule for this user."
                    />
                    <Toggle
                      label="Lock password"
                      checked={u.lockPassword}
                      onChange={(v) => updateUser(u.id, { lockPassword: v })}
                      tooltip="Disables password login — user can only authenticate via SSH key."
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="SSH Public Key"
                      value={u.sshKey}
                      onChange={(e) => updateUser(u.id, { sshKey: e.target.value })}
                      placeholder="ssh-rsa AAAA..."
                      className="min-h-[60px] font-mono text-xs"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={addUser} className="mt-3">
            + Add User
          </Button>
        </>
      )}
    </section>
  )
}
