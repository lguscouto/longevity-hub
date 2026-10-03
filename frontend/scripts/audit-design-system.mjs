#!/usr/bin/env node
/**
 * Design System Conformance Audit (UX_UI_34 / UX21-P0-01)
 *
 * Varredura estática de frontend/src contra as regras do docs/DESIGN_SYSTEM.md.
 * Sem dependências externas.
 *
 * Status por categoria:
 *   PASS       0 ocorrências não justificadas
 *   EXCEPTION  todas as ocorrências possuem `ds-exception: DSX-NNN` registrado
 *              em docs/DESIGN_SYSTEM_EXCEPTIONS.md
 *   WARN       dívida legada: ocorrências > 0 e <= baseline (audit-baseline.json)
 *   FAIL       regressão: ocorrências > baseline, ou exceção referenciada sem registro
 *
 * Uso:
 *   npm run audit:design-system
 *   node scripts/audit-design-system.mjs --verbose          # lista arquivo:linha
 *   node scripts/audit-design-system.mjs --json             # saída JSON em stdout
 *   node scripts/audit-design-system.mjs --update-baseline  # regrava o baseline (ratchet down)
 *
 * Marcação de exceção (mesma linha ou linha imediatamente anterior):
 *   // ds-exception: DSX-001
 *   {/* ds-exception: DSX-001 *\/}
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(FRONTEND_DIR, '..');
const SRC_DIR = path.join(FRONTEND_DIR, 'src');
const BASELINE_PATH = path.join(FRONTEND_DIR, 'audit-baseline.json');
const REGISTRY_PATH = path.join(REPO_ROOT, 'docs', 'DESIGN_SYSTEM_EXCEPTIONS.md');
const REPORT_PATH = path.join(FRONTEND_DIR, 'test-results', 'design-system-audit.json');

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has('--verbose');
const AS_JSON = args.has('--json');
const UPDATE_BASELINE = args.has('--update-baseline');

/** Regras. `pattern` roda por linha. `skipUi` ignora components/ui (primitives têm direito às tags nativas). */
const RULES = [
  { id: 'typography.micro-9', category: 'Typography', pattern: /text-\[9px\]/g, why: 'Microtexto < 12px (9px)' },
  { id: 'typography.micro-10', category: 'Typography', pattern: /text-\[10(?:\.5)?px\]/g, why: 'Microtexto < 12px (10px)' },
  { id: 'typography.micro-11', category: 'Typography', pattern: /text-\[11px\]/g, why: 'Microtexto < 12px (11px)' },
  { id: 'radius.arbitrary', category: 'Radius', pattern: /rounded(?:-[trbl]{1,2})?-\[[^\]]+\]/g, why: 'Radius arbitrário fora da escala' },
  { id: 'radius.3xl', category: 'Radius', pattern: /rounded(?:-[trbl]{1,2})?-3xl/g, why: 'rounded-3xl descontinuado' },
  { id: 'radius.non-token', category: 'Radius', pattern: /(?<![-\w])rounded(?:-[trbl]{1,2})?-(?:sm|md|lg|xl|2xl)\b/g, why: 'Radius Tailwind padrão em vez de token radius-* (tailwind.config.js)' },
  { id: 'gradients.bg', category: 'Gradients', pattern: /bg-gradient-to-/g, why: 'Gradiente de fundo' },
  { id: 'effects.glow', category: 'Effects', pattern: /\bglow(?:-[a-z0-9]+)?\b/g, why: 'Glow decorativo' },
  { id: 'effects.backdrop-blur', category: 'Effects', pattern: /backdrop-blur(?:-[a-z0-9]+)?/g, why: 'Backdrop blur / glassmorphism' },
  { id: 'effects.arbitrary-shadow', category: 'Effects', pattern: /shadow-\[[^\]]+\]/g, why: 'Sombra fora dos tokens' },
  { id: 'focus.outline-none', category: 'Focus', pattern: /(?<![-\w])focus:outline-none/g, why: 'focus:outline-none sem anel focus-visible' },
  { id: 'motion.decorative', category: 'Motion', pattern: /animate-(?:ping|bounce)\b/g, why: 'Animação decorativa permanente' },
  { id: 'native.button', category: 'Native controls', pattern: /<button\b/g, why: '<button> nativo fora dos primitives', skipUi: true },
  { id: 'native.input', category: 'Native controls', pattern: /<input\b/g, why: '<input> nativo fora dos primitives', skipUi: true },
  { id: 'native.select', category: 'Native controls', pattern: /<select\b/g, why: '<select> nativo fora dos primitives', skipUi: true },
  { id: 'native.textarea', category: 'Native controls', pattern: /<textarea\b/g, why: '<textarea> nativo fora dos primitives', skipUi: true },
];

const EXCEPTION_MARK = /ds-exception:\s*(DSX-\d+)/;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__snapshots__') continue;
      out.push(...walk(full));
    } else if (/\.(tsx|ts|css)$/.test(entry.name) && !/\.(test|spec)\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function loadRegistryIds() {
  if (!fs.existsSync(REGISTRY_PATH)) return new Set();
  const text = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return new Set([...text.matchAll(/\|\s*(DSX-\d+)\s*\|/g)].map((m) => m[1]));
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).rules ?? {};
}

function relative(file) {
  return path.relative(REPO_ROOT, file).replace(/\\/g, '/');
}

function scan() {
  const registry = loadRegistryIds();
  const findings = []; // { rule, file, line, excerpt, exception }
  const missingRegistry = [];

  for (const file of walk(SRC_DIR)) {
    const rel = relative(file);
    const inUi = rel.includes('/components/ui/');
    const isCss = rel.endsWith('.css');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((text, idx) => {
      for (const rule of RULES) {
        if (rule.skipUi && inUi) continue;
        if (isCss && (rule.category === 'Motion' || rule.category === 'Native controls')) continue;
        rule.pattern.lastIndex = 0;
        const matches = text.match(rule.pattern);
        if (!matches) continue;
        const mark = text.match(EXCEPTION_MARK) ?? (idx > 0 ? lines[idx - 1].match(EXCEPTION_MARK) : null);
        const exception = mark ? mark[1] : null;
        if (exception && !registry.has(exception)) {
          missingRegistry.push({ file: rel, line: idx + 1, exception });
        }
        for (let i = 0; i < matches.length; i += 1) {
          findings.push({ rule: rule.id, file: rel, line: idx + 1, excerpt: text.trim().slice(0, 140), exception });
        }
      }
    });
  }
  return { findings, missingRegistry };
}

function summarize({ findings, missingRegistry }) {
  const baseline = loadBaseline();
  const rows = RULES.map((rule) => {
    const all = findings.filter((f) => f.rule === rule.id);
    const justified = all.filter((f) => f.exception).length;
    const open = all.length - justified;
    const allowed = baseline[rule.id] ?? 0;
    let status;
    if (open === 0) status = justified > 0 ? 'EXCEPTION' : 'PASS';
    else if (open > allowed) status = 'FAIL';
    else status = 'WARN';
    return { rule: rule.id, category: rule.category, why: rule.why, total: all.length, justified, open, baseline: allowed, status };
  });
  const orphan = missingRegistry.length > 0;
  const worst = rows.some((r) => r.status === 'FAIL') || orphan ? 'FAIL' : rows.some((r) => r.status === 'WARN') ? 'WARN' : 'PASS';
  return { rows, worst, orphan: missingRegistry };
}

function printReport(summary, findings) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log('Design System Conformance Audit');
  console.log('────────────────────────────────────────────────────────────────────────');
  console.log(`${pad('Rule', 28)}${pad('Open', 7)}${pad('Exc.', 6)}${pad('Base', 7)}Status`);
  for (const r of summary.rows) {
    console.log(`${pad(r.rule, 28)}${pad(r.open, 7)}${pad(r.justified, 6)}${pad(r.baseline, 7)}${r.status}`);
  }
  console.log('────────────────────────────────────────────────────────────────────────');
  const byCategory = new Map();
  for (const r of summary.rows) {
    const cur = byCategory.get(r.category) ?? 'PASS';
    const rank = { PASS: 0, EXCEPTION: 1, WARN: 2, FAIL: 3 };
    byCategory.set(r.category, rank[r.status] > rank[cur] ? r.status : cur);
  }
  for (const [cat, st] of byCategory) console.log(`${pad(cat, 20)}${st}`);
  if (summary.orphan.length) {
    console.log('\nExceções sem registro em docs/DESIGN_SYSTEM_EXCEPTIONS.md:');
    for (const o of summary.orphan) console.log(`  ${o.file}:${o.line} → ${o.exception}`);
  }
  if (VERBOSE) {
    console.log('\nOcorrências abertas:');
    for (const f of findings.filter((x) => !x.exception)) console.log(`  [${f.rule}] ${f.file}:${f.line}  ${f.excerpt}`);
  }
  console.log(`\nResultado global: ${summary.worst}`);
}

export { RULES, walk, scan, summarize, loadBaseline, loadRegistryIds, runCli };

function runCli() {
  const result = scan();
  const summary = summarize(result);

  if (UPDATE_BASELINE) {
    const rules = Object.fromEntries(summary.rows.map((r) => [r.rule, r.open]));
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), rules }, null, 2)}\n`);
    console.log(`Baseline gravado em ${relative(BASELINE_PATH)}`);
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), worst: summary.worst, rows: summary.rows, findings: result.findings }, null, 2),
  );

  if (AS_JSON) console.log(JSON.stringify({ worst: summary.worst, rows: summary.rows }, null, 2));
  else printReport(summary, result.findings);

  // WARN (dívida legada dentro do baseline) não derruba o CI; FAIL (regressão) sim.
  process.exit(summary.worst === 'FAIL' ? 1 : 0);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile && currentFile === invokedFile) {
  runCli();
}
