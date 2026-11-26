export type CodeFinding = {
  severity: 'critical' | 'warning' | 'info'
  title: string
  line: number
  detail: string
}

export type CodeAnalysis = {
  lines: number
  score: number
  findings: CodeFinding[]
  omittedFindings: number
}

export type ResumeAnalysis = {
  wordCount: number
  bulletCount: number
  quantifiedBullets: number
  sections: string[]
  score: number
  matchedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
}

const credentialPattern =
  /\b(?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*(['"])[^'"\r\n]{8,}\1/i

export function analyzeCode(source: string, language: string): CodeAnalysis {
  const lines = source.split(/\r?\n/)
  const findings: CodeFinding[] = []
  const addFinding = (finding: CodeFinding) => findings.push(finding)

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    if (line.length > 120) {
      addFinding({
        severity: 'info',
        title: 'Long line',
        line: lineNumber,
        detail: `This line is ${line.length} characters; consider wrapping it near 120 characters.`,
      })
    }

    if (/\b(?:TODO|FIXME)\b/i.test(line)) {
      addFinding({
        severity: 'info',
        title: 'Unresolved note',
        line: lineNumber,
        detail: 'Review this TODO or FIXME before treating the work as complete.',
      })
    }

    if (credentialPattern.test(line)) {
      addFinding({
        severity: 'critical',
        title: 'Possible hard-coded credential',
        line: lineNumber,
        detail: 'Move this value to a secret store or environment variable. The value is not shown in this report.',
      })
    }

    if (/\beval\s*\(/.test(line)) {
      addFinding({
        severity: 'warning',
        title: 'Dynamic code evaluation',
        line: lineNumber,
        detail: 'Review whether evaluating a string as code is necessary and ensure its input cannot be controlled by users.',
      })
    }

    if ((language === 'JavaScript' || language === 'TypeScript') && /\bconsole\.(?:log|debug)\s*\(/.test(line)) {
      addFinding({
        severity: 'info',
        title: 'Debug logging',
        line: lineNumber,
        detail: 'Remove or replace development logging before shipping production code.',
      })
    }

    if ((language === 'JavaScript' || language === 'TypeScript') && /\bdebugger\s*;?/.test(line)) {
      addFinding({
        severity: 'warning',
        title: 'Debugger statement',
        line: lineNumber,
        detail: 'Remove this statement so it does not pause execution for users.',
      })
    }
  })

  const severityWeight = { critical: 25, warning: 12, info: 4 }
  const sortedFindings = findings.sort(
    (left, right) =>
      severityWeight[right.severity] - severityWeight[left.severity] || left.line - right.line,
  )

  return {
    lines: lines.length,
    score: Math.max(
      0,
      100 - findings.reduce((total, finding) => total + severityWeight[finding.severity], 0),
    ),
    findings: sortedFindings.slice(0, 100),
    omittedFindings: Math.max(0, sortedFindings.length - 100),
  }
}

const resumeSections: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Summary', pattern: /\b(?:summary|profile|objective)\b/i },
  { label: 'Experience', pattern: /\b(?:experience|employment|work history)\b/i },
  { label: 'Education', pattern: /\b(?:education|academic background)\b/i },
  { label: 'Skills', pattern: /\b(?:skills|technical skills|technologies)\b/i },
  { label: 'Projects', pattern: /\b(?:projects|selected work|portfolio)\b/i },
  { label: 'Certifications', pattern: /\b(?:certifications|certificates|licenses)\b/i },
]

const stopWords = new Set(
  `about after again against all also and any are because been before being between both but can candidate could developer development did does doing down during each engineer few for from further had has have having here how into its itself just job looking more most need nor not now off once only other our out over own role same should some such than that the their them then there these they this those through too under until very was were what when where which while who will with would years your you work team ability experience skills strong including using required preferred responsibilities qualifications`.split(
    ' ',
  ),
)

const actionVerbPattern =
  /\b(?:achieved|automated|built|created|cut|delivered|designed|developed|drove|enabled|established|improved|increased|launched|led|managed|optimized|reduced|replaced|resolved|scaled|shipped|streamlined)\b/i

export function analyzeResume(resume: string, jobDescription: string): ResumeAnalysis {
  const words = resume.match(/[a-zA-Z0-9+#.-]+/g) ?? []
  const resumeLines = resume.split(/\r?\n/)
  const bulletLines = resumeLines.filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line))
  const quantifiedBullets = bulletLines.filter((line) => /\b\d+(?:[.,]\d+)?%?\b/.test(line)).length
  const sections = resumeSections
    .filter(({ pattern }) => pattern.test(resume))
    .map(({ label }) => label)

  const jobTokens = (jobDescription.toLowerCase().match(/[a-z][a-z0-9+#-]{2,}/g) ?? [])
    .filter((token) => !stopWords.has(token))
  const resumeTokens = new Set((resume.toLowerCase().match(/[a-z][a-z0-9+#-]{2,}/g) ?? []))
  const keywordFrequency = new Map<string, number>()
  for (const token of jobTokens) {
    keywordFrequency.set(token, (keywordFrequency.get(token) ?? 0) + 1)
  }

  const keywords = [...keywordFrequency.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([token]) => token)
  const matchedKeywords = keywords.filter((keyword) => resumeTokens.has(keyword))
  const missingKeywords = keywords.filter((keyword) => !resumeTokens.has(keyword))

  const lengthPoints = words.length >= 300 && words.length <= 900 ? 15 : words.length >= 150 && words.length <= 1200 ? 8 : 0
  const score = Math.min(40, sections.length * 10)
    + Math.min(20, bulletLines.length * 2)
    + Math.min(15, quantifiedBullets * 5)
    + lengthPoints
    + (keywords.length
      ? Math.round((matchedKeywords.length / keywords.length) * 10)
      : 10)

  const suggestions: string[] = []
  const missingSections = resumeSections
    .filter(({ label }) => ['Experience', 'Education', 'Skills'].includes(label) && !sections.includes(label))
    .map(({ label }) => label)

  if (missingSections.length) {
    suggestions.push(`Consider adding a clear ${missingSections.join(', ')} section.`)
  }
  if (!bulletLines.length) {
    suggestions.push('Use concise bullet points to make accomplishments easier to scan.')
  } else if (quantifiedBullets < Math.min(3, bulletLines.length)) {
    suggestions.push('Add measurable outcomes to relevant bullets, such as time saved, scale, or percentage improvement.')
  }
  if (words.length < 150) {
    suggestions.push('Add enough detail to show the scope of your experience and accomplishments.')
  } else if (words.length > 1200) {
    suggestions.push('Consider shortening the resume and prioritizing the most relevant experience.')
  }
  if (bulletLines.length && !bulletLines.some((line) => actionVerbPattern.test(line))) {
    suggestions.push('Start accomplishment bullets with specific action verbs, such as built, improved, or delivered.')
  }
  if (missingKeywords.length) {
    suggestions.push(`If accurate, reflect relevant job-description terms: ${missingKeywords.slice(0, 5).join(', ')}.`)
  }
  if (!suggestions.length) {
    suggestions.push('Your resume covers the main checklist items. Review it for accuracy and tailor it to each role.')
  }

  return {
    wordCount: words.length,
    bulletCount: bulletLines.length,
    quantifiedBullets,
    sections,
    score,
    matchedKeywords,
    missingKeywords,
    suggestions,
  }
}
