import { useState } from 'react'
import { Check, FileText, LockKeyhole, Sparkles, Upload } from 'lucide-react'
import { analyzeResume, type ResumeAnalysis } from '../lib/localAnalysis'

function ResumeAnalyzerPage() {
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = () => {
    if (!resume.trim()) {
      setError('Paste your resume text or choose a .txt or .md file to start.')
      setAnalysis(null)
      return
    }
    setError(null)
    setAnalysis(analyzeResume(resume, jobDescription))
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    if (!/\.(?:md|txt)$/i.test(file.name)) {
      setError('Choose a plain text (.txt) or Markdown (.md) resume file.')
      return
    }
    if (file.size > 500_000) {
      setError('Files must be 500 KB or smaller for a local review.')
      return
    }

    try {
      setResume(await file.text())
      setAnalysis(null)
      setError(null)
    } catch {
      setError('This file could not be read. Try pasting its text instead.')
    }
  }

  return (
    <div className="content tool-content">
      <div className="eyebrow"><span className="eyebrow-line" /> PRIVATE RESUME REVIEW</div>
      <h1>Resume analyzer</h1>
      <p className="page-description">Get a practical structure and keyword check. No account or external AI service is needed.</p>

      <div className="tool-privacy-note"><LockKeyhole size={15} /><span>Your resume stays in this browser and is not uploaded or saved.</span></div>

      <section className="panel tool-panel" aria-label="Resume analysis input">
        <div className="tool-panel-heading">
          <div><h2>Add your resume</h2><p>Paste the text below or import a plain text or Markdown file (up to 500 KB).</p></div>
          <FileText size={20} aria-hidden="true" />
        </div>
        <label className="tool-field source-field">
          <span>Resume text</span>
          <textarea
            value={resume}
            maxLength={500_000}
            placeholder={'Paste resume text here…\n\nInclude headings such as Experience, Education, and Skills.'}
            onChange={(event) => {
              setResume(event.target.value)
              setAnalysis(null)
              setError(null)
            }}
          />
        </label>
        <div className="tool-controls resume-controls">
          <label className="upload-button">
            <Upload size={15} /> Import .txt or .md
            <input
              type="file"
              accept=".md,.txt,text/plain,text/markdown"
              onChange={(event) => {
                void handleFile(event.target.files?.[0])
                event.currentTarget.value = ''
              }}
            />
          </label>
          <span className="character-count">{resume.length.toLocaleString()} / 500,000 characters</span>
        </div>
        <label className="tool-field job-field">
          <span>Job description <small>Optional, for a keyword comparison</small></span>
          <textarea
            value={jobDescription}
            maxLength={20_000}
            placeholder="Paste the role description to see which relevant terms appear in your resume."
            onChange={(event) => {
              setJobDescription(event.target.value)
              setAnalysis(null)
            }}
          />
        </label>
        {error && <p className="tool-error" role="alert">{error}</p>}
        <div className="tool-submit-row">
          <span>All checks run locally</span>
          <button className="primary-button" type="button" onClick={handleAnalyze}><Sparkles size={16} /> Analyze resume</button>
        </div>
      </section>

      {analysis && (
        <section className="tool-results" aria-live="polite">
          <div className="panel score-panel">
            <div className="score-gauge"><strong>{analysis.score}</strong><span>/ 100</span></div>
            <div><h2>Resume checklist</h2><p>A structural checklist, not a prediction of hiring outcomes.</p></div>
            <div className="score-meta">
              <strong>{analysis.wordCount}</strong><span>words</span>
              <strong>{analysis.bulletCount}</strong><span>bullets</span>
            </div>
          </div>

          <div className="resume-result-grid">
            <div className="panel resume-detail-panel">
              <h2>Structure</h2>
              <div className="section-checks">
                {['Summary', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications'].map((section) => (
                  <span className={analysis.sections.includes(section) ? 'section-found' : ''} key={section}>
                    <Check size={13} />{section}
                  </span>
                ))}
              </div>
              <p>{analysis.quantifiedBullets} of {analysis.bulletCount} bullet points include a number or percentage.</p>
            </div>
            {jobDescription.trim() && (
              <div className="panel resume-detail-panel">
                <h2>Job keyword check</h2>
                <p>{analysis.matchedKeywords.length} of {analysis.matchedKeywords.length + analysis.missingKeywords.length} suggested terms found.</p>
                {analysis.matchedKeywords.length > 0 && <div className="keyword-list">{analysis.matchedKeywords.map((word) => <span className="keyword-matched" key={word}>{word}</span>)}</div>}
                {analysis.missingKeywords.length > 0 && <div className="keyword-list">{analysis.missingKeywords.map((word) => <span className="keyword-missing" key={word}>{word}</span>)}</div>}
                <small>Terms are extracted with simple frequency rules; only include them when they accurately describe your experience.</small>
              </div>
            )}
            <div className="panel resume-detail-panel suggestions-panel">
              <h2>Suggestions</h2>
              <ul>{analysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default ResumeAnalyzerPage
