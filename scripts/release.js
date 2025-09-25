#!/usr/bin/env node
/*
 Automated release helper:
 - Finds previous meaningful tag
 - Classifies commits since then
 - Computes semver bump
 - Updates package.json and VERSION
 - Prepends CHANGELOG
 - Commits, tags and pushes
*/
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim()
}

function getTags() {
  try { sh('git fetch --tags --quiet') } catch {}
  const out = sh(`git tag --list 'v*' --sort=-v:refname`)
  return out ? out.split('\n').filter(Boolean) : []
}

function isReleaseOnlyTag(tag) {
  if (!tag) return false
  const subj = sh(`git show -s --format=%s ${tag}`)
  return /^chore\(release\)/i.test(subj)
}

function getPrevMeaningfulTag() {
  const tags = getTags()
  if (tags.length === 0) return null
  if (isReleaseOnlyTag(tags[0])) return tags[1] || null
  return tags[0]
}

function listCommits(range) {
  const out = sh(`git log --no-merges --pretty='%H\t%h\t%s' ${range}`)
  const lines = out ? out.split('\n').filter(Boolean) : []
  return lines
    .map((l) => {
      const [hash, short, subjectRaw] = l.split('\t')
      const subject = subjectRaw || ''
      return { hash, short, subject }
    })
    .filter((c) => !/^chore\(release\)/i.test(c.subject))
}

function filesForCommit(hash) {
  const out = sh(`git show --name-only --pretty=format: ${hash}`)
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function classify(commit) {
  const subj = commit.subject
  const m = subj.match(/^(\w+)(\(.*?\))?(!)?:\s+(.*)$/)
  const type = m ? m[1].toLowerCase() : null
  const isBreaking = (m && m[3] === '!') || /breaking change:/i.test(subj)
  if (isBreaking) return { group: 'breaking', subject: subj }
  if (type === 'feat') return { group: 'features', subject: subj }
  if (type === 'fix') return { group: 'fixes', subject: subj }
  if (type === 'perf') return { group: 'performance', subject: subj }
  if (type === 'refactor') return { group: 'refactors', subject: subj }
  if (type === 'docs' || type === 'chore' || type === 'style' || type === 'test') return { group: 'chore', subject: subj }
  // Heuristic
  const files = filesForCommit(commit.hash)
  const touchedApp = files.some((f) => /^src\/app\//.test(f) || /^app\//.test(f))
  const touchedUi = files.some((f) => /^src\/components\//.test(f) || /^src\/lib\//.test(f))
  const keywords = /search|routing|printing|theming|indexing|ui|page|route/i
  if (touchedApp || touchedUi || keywords.test(subj)) return { group: 'features', subject: subj }
  return { group: 'chore', subject: subj }
}

function decideBump(groups) {
  if (groups.breaking.length > 0) return 'major'
  if (groups.features.length > 0) return 'minor'
  if (groups.fixes.length > 0 || groups.performance.length > 0) return 'patch'
  return 'patch'
}

function bumpVersion(cur, bump) {
  const [maj, min, pat] = cur.split('.').map((n) => parseInt(n, 10))
  if (bump === 'major') return `${maj + 1}.0.0`
  if (bump === 'minor') return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

function prependChangelog(version, groups) {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const header = `## v${version} — ${y}-${m}-${d}`
  const sec = (title, arr) => arr.length ? `\n### ${title}\n${arr.map((e) => `- ${e}`).join('\n')}` : ''
  const content = [
    header,
    sec('Features', groups.features),
    sec('Fixes', groups.fixes),
    sec('Performance', groups.performance),
    sec('Refactors / Chore / Docs', groups.refactors.concat(groups.chore)),
    ''
  ].join('\n')
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md')
  const prev = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : ''
  fs.writeFileSync(changelogPath, `${content}\n${prev}`)
}

function main() {
  const prevTag = getPrevMeaningfulTag()
  const range = prevTag ? `${prevTag}..HEAD` : 'HEAD'
  const raw = listCommits(range)
  if (raw.length === 0) {
    console.log('No commits to release.')
    process.exit(0)
  }
  const groups = { breaking: [], features: [], fixes: [], performance: [], refactors: [], chore: [] }
  for (const c of raw) {
    const cls = classify(c)
    const line = `${cls.subject} (${c.short})`
    if (cls.group === 'breaking') groups.breaking.push(line)
    else if (cls.group === 'features') groups.features.push(line)
    else if (cls.group === 'fixes') groups.fixes.push(line)
    else if (cls.group === 'performance') groups.performance.push(line)
    else if (cls.group === 'refactors') groups.refactors.push(line)
    else groups.chore.push(line)
  }
  const bump = decideBump(groups)
  const pkgPath = path.join(process.cwd(), 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const cur = pkg.version
  const next = bumpVersion(cur, bump)
  pkg.version = next
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  const versionFile = path.join(process.cwd(), 'VERSION')
  if (fs.existsSync(versionFile)) fs.writeFileSync(versionFile, `${next}\n`)
  prependChangelog(next, groups)
  sh('git add CHANGELOG.md package.json VERSION 2>/dev/null || true')
  const commitMsg = `chore(release): v${next} (recomputed)`
  sh(`git commit -m "${commitMsg}"`)
  const tagMsg = [`Release v${next}`, '', `Bump type: ${bump}`, prevTag ? `Prev tag: ${prevTag}` : 'Prev tag: none'].join('\n')
  sh(`git tag -a v${next} -m ${JSON.stringify(tagMsg)}`)
  try { sh('git push') } catch {}
  try { sh('git push --tags') } catch {}
  console.log(JSON.stringify({ prevTag: prevTag || null, nextVersion: next, bump }, null, 2))
}

main()


