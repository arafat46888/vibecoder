import JSZip from 'jszip'
import type { ProjectFiles } from '../lib/parseResponse'

/** Build a downloadable ZIP of the generated app (PRD §4.3 Deploy button). */
export async function downloadZip(files: ProjectFiles, name = 'ai-app'): Promise<void> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  zip.file(
    'README.md',
    `# ${name}\n\nGenerated with AI Web App Builder (BYOK). Open \`index.html\` in any static host.\n`,
  )
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Export the project to CodeSandbox via its define API (no backend needed). */
export function exportToCodeSandbox(files: ProjectFiles): string {
  const search = new URLSearchParams({
    'environment-url': 'https://codesandbox-react-static-template.surge.sh/',
    fonts: '[]',
    'module-1': 'sandpack-static-bundler@0.11.8',
    'template': 'static',
  })
  let i = 2
  for (const [path, content] of Object.entries(files)) {
    search.set(`module-${i}`, path)
    search.set(`module-${i}-contents`, content)
    if (path === 'index.html') search.set('entry', path)
    i++
  }
  if (!search.get('entry')) search.set('entry', 'index.html')
  return `https://codesandbox.io/p/sandbox/new?${search.toString()}`
}
