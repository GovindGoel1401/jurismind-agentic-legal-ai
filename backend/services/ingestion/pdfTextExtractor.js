import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendRoot = path.resolve(__dirname, '..', '..')
const extractorScriptPath = path.resolve(backendRoot, 'scripts', 'extract_pdf_text.py')

export async function extractPdfText(pdfPath) {
  const { stdout } = await execFileAsync('python', [extractorScriptPath, pdfPath], {
    cwd: backendRoot,
    maxBuffer: 20 * 1024 * 1024,
    encoding: 'utf8',
  })

  const payload = JSON.parse(stdout)
  if (!payload?.success) {
    throw new Error(payload?.error || 'PDF extraction failed.')
  }

  return {
    page_count: payload.page_count || 0,
    pages: payload.pages || [],
    text: payload.text || '',
  }
}
