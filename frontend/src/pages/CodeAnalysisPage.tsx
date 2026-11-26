import { useState } from 'react'
import { AlertTriangle, Check, FileCode2, LockKeyhole, ShieldCheck, Upload } from 'lucide-react'
import { analyzeCode, type CodeAnalysis, type CodeFinding } from '../lib/localAnalysis'

const languages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Other']
const acceptedCodeFile = /\.(?:c|cc|cpp|cs|css|go|h|html|java|js|jsx|md|php|py|rb|rs|sh|sql|ts|tsx|txt|xml|yaml|yml)$/i

function CodeAnalysisPage() {
  const [source, setSource] = useState('')
  const [language, setLanguage] = useState('TypeScript')
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = () => {
    if (!source.trim()) {
      setError('Paste code or choose a source file to start the review.')
      setAnalysis(null)
      return
    }
    setError(null)
    setAnalysis(analyzeCode(source, language))
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    if (!acceptedCodeFile.test(file.name)) {
      setError('Choose a supported source or text file.')
      return
    }
    if (file.size > 500_000) {
      setError('Files must be 500 KB or smaller for a local review.')
      return
    }

    try {
      setSource(await file.text())
      setAnalysis(null)
      setError(null)
    } catch {
      setError('This file could not be read. Try pasting its contents instead.')
    }
  }

  return (
    <div className="content tool-content">
      <div className="eyebrow"><span className="eyebrow-line" /> LOCAL CODE REVIEW</div>
      <h1>Code analysis</h1>
      <p className="page-description">Check common maintainability and security warning signs without sending your code anywhere.</p>

      <div className="tool-privacy-note"><LockKeyhole size={15} /><span>Runs in this browser. Your code is not uploaded or saved.</span></div>

      <section className="panel tool-panel" aria-label="Code review input">
        <div className="tool-panel-heading">
          <div><h2>Review source code</h2><p>Paste a snippet or import a source file up to 500 KB.</p></div>
          <FileCode2 size={20} aria-hidden="true" />
        </div>
        <div className="tool-controls">
          <label className="tool-field">
            <span>Language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {languages.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="upload-button">
            <Upload size={15} /> Choose source file
            <input
              type="file"
              accept=".c,.cc,.cpp,.cs,.css,.go,.h,.html,.java,.js,.jsx,.md,.php,.py,.rb,.rs,.sh,.sql,.ts,.tsx,.txt,.xml,.yaml,.yml"
              onChange={(event) => {
                void handleFile(event.target.files?.[0])
                event.currentTarget.value = ''
              }}
            />
          </label>
        </div>
        <label className="tool-field source-field">
          <span className="sr-only">Source code</span>
          <textarea
            value={source}
            maxLength={500_000}
            placeholder={'Paste code here…\n\nExample:\nconst result = eval(userInput)'}
            spellCheck={false}
            onChange={(event) => {
              setSource(event.target.value)
              setAnalysis(null)
              setError(null)
            }}
          />
        </label>
        {error && <p className="tool-error" role="alert">{error}</p>}
        <div className="tool-submit-row">
          <span>{source.length.toLocaleString()} / 500,000 characters</span>
          <button className="primary-button" type="button" onClick={handleAnalyze}><ShieldCheck size={16} /> Analyze code</button>
        </div>
      </section>

      {analysis && (
        <section className="tool-results" aria-live="polite">
          <div className="panel score-panel">
            <div className="score-gauge"><strong>{analysis.score}</strong><span>/ 100</span></div>
            <div><h2>Review score</h2><p>A heuristic indicator based on the findings below, not a compiler or full security audit.</p></div>
            <div className="score-meta"><strong>{analysis.findings.length + analysis.omittedFindings}</strong><span>findings</span><strong>{analysis.lines}</strong><span>lines</span></div>
          </div>
          <div className="panel findings-panel">
            <div className="tool-panel-heading">
              <div><h2>Findings</h2><p>Review each item in context before making changes.</p></div>
            </div>
            {analysis.findings.length ? (
              <ul className="finding-list">
                {analysis.findings.map((finding, index) => <FindingRow finding={finding} key={`${finding.line}-${finding.title}-${index}`} />)}
              </ul>
            ) : (
              <div className="tool-success"><Check size={17} /><span>No common warning signs were detected by these checks.</span></div>
            )}
            {analysis.omittedFindings > 0 && <p className="tool-footnote">{analysis.omittedFindings} additional findings were omitted from this report.</p>}
          </div>
        </section>
      )}
      <p className="tool-footnote"><AlertTriangle size={13} /> This local analyzer uses simple text patterns. It can miss issues and report false positives; use your language-specific compiler, linter, and security tools too.</p>
    </div>
  )
}

function FindingRow({ finding }: { finding: CodeFinding }) {
  return (
    <li className="finding-row">
      <span className={`finding-severity severity-${finding.severity}`} aria-label={finding.severity} />
      <div><strong>{finding.title}</strong><p>{finding.detail}</p></div>
      <span className="finding-line">Line {finding.line}</span>
    </li>
  )
}

export default CodeAnalysisPage
