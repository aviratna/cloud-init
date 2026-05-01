import { useStore } from '../store'
import { Button, Card, InfoBanner, Input, Select, SectionHeader, Textarea, Toggle } from '../components/ui'
import type { FileEncoding } from '../types'

const ENCODING_OPTS = [
  { value: 'text', label: 'Plain text' },
  { value: 'base64', label: 'Base64' },
  { value: 'gz+base64', label: 'Gzip + Base64' },
]

export function WriteFilesSection() {
  const {
    enabledSections, writeFiles,
    toggleSection, addWriteFile, updateWriteFile, removeWriteFile, resetWriteFiles,
  } = useStore()
  const enabled = enabledSections.writeFiles

  return (
    <section>
      <SectionHeader title="Write Files" icon="📝" enabled={enabled} onToggle={() => toggleSection('writeFiles')} onReset={resetWriteFiles} />
      <InfoBanner>
        Writes files to the filesystem before <code className="bg-slate-800 px-1 rounded">runcmd</code> executes.
        Useful for config files, scripts, and service units. Use <strong>base64</strong> encoding for binary files.
        Parent directories are created automatically. Content is written as the specified owner/permissions.
      </InfoBanner>

      {!enabled && <p className="text-slate-500 text-sm text-center py-4">Section disabled — enable to configure</p>}

      {enabled && (
        <>
          <div className="space-y-3">
            {writeFiles.map((f, idx) => (
              <Card key={f.id}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">
                    File {idx + 1}{f.path && ` — ${f.path}`}
                  </span>
                  <Button variant="danger" size="sm" type="button" onClick={() => removeWriteFile(f.id)}>Remove</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="File Path"
                    value={f.path}
                    onChange={(e) => updateWriteFile(f.id, { path: e.target.value })}
                    placeholder="/etc/myapp/config.conf"
                    className="col-span-2"
                  />
                  <Input
                    label="Permissions"
                    value={f.permissions}
                    onChange={(e) => updateWriteFile(f.id, { permissions: e.target.value })}
                    placeholder="0644"
                    tooltip="Octal permissions string, e.g. 0644 (rw-r--r--) or 0755 (rwxr-xr-x)."
                  />
                  <Input
                    label="Owner"
                    value={f.owner}
                    onChange={(e) => updateWriteFile(f.id, { owner: e.target.value })}
                    placeholder="root:root"
                    tooltip="user:group format. The user and group must exist when the file is written."
                  />
                  <Select
                    label="Encoding"
                    value={f.encoding}
                    onChange={(e) => updateWriteFile(f.id, { encoding: e.target.value as FileEncoding })}
                    options={ENCODING_OPTS}
                  />
                  <div className="flex items-end pb-1">
                    <Toggle
                      label="Append to existing file"
                      checked={f.append}
                      onChange={(v) => updateWriteFile(f.id, { append: v })}
                      tooltip="If true, content is appended rather than overwriting the file."
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Content"
                      value={f.content}
                      onChange={(e) => updateWriteFile(f.id, { content: e.target.value })}
                      placeholder="File content here..."
                      className="font-mono text-xs min-h-[100px]"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={addWriteFile} className="mt-3">
            + Add File
          </Button>
        </>
      )}
    </section>
  )
}
