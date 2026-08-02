#!/usr/bin/env node
/**
 * Export Cursor chats to .cursor-chat.json (compatible with Cursor Chat Transfer import).
 * Uses local sqlite3 CLI only — no external dependencies.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SQLITE3 = ['/opt/homebrew/bin/sqlite3', '/usr/bin/sqlite3', '/usr/local/bin/sqlite3'].find(
  (p) => fs.existsSync(p),
);

if (!SQLITE3) {
  console.error('sqlite3 not found');
  process.exit(1);
}

const HOME = os.homedir();
const GLOBAL_DB = path.join(
  HOME,
  'Library/Application Support/Cursor/User/globalStorage/state.vscdb',
);
const WS_DIR = path.join(HOME, 'Library/Application Support/Cursor/User/workspaceStorage');
const PROJECT_PATH = '/Users/berkanprivat/Woeschplan';
const OUT =
  process.argv[2] ||
  path.join(HOME, 'Woeschplan-Migration-Backup/latest/woeschplan-cursor-chats.cursor-chat.json');

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function runSql(dbPath, sql) {
  const result = spawnSync(SQLITE3, ['-cmd', '.timeout 5000', dbPath], {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 512,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `sqlite3 failed (${result.status})`);
  }
  return result.stdout ?? '';
}

function hexToUtf8(hex) {
  const clean = (hex || '').trim();
  if (!clean) return null;
  try {
    return Buffer.from(clean, 'hex').toString('utf8');
  } catch {
    return null;
  }
}

function readItemTableJson(dbPath, key) {
  const sql = `SELECT hex(value) FROM ItemTable WHERE key = '${sqlEscape(key)}';\n`;
  const out = runSql(dbPath, sql).trim();
  const line = out.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (!line) return null;
  const text = hexToUtf8(line);
  if (!text) return null;
  return JSON.parse(text);
}

function readKv(dbPath, key) {
  const sql = `SELECT hex(value) FROM cursorDiskKV WHERE key = '${sqlEscape(key)}';\n`;
  const out = runSql(dbPath, sql).trim();
  const line = out.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (!line) return null;
  return hexToUtf8(line);
}

function readBubbles(dbPath, composerId) {
  const prefix = `bubbleId:${composerId}:`;
  const sql = `SELECT hex(key), hex(value) FROM cursorDiskKV WHERE key LIKE '${sqlEscape(prefix)}%';\n`;
  const out = runSql(dbPath, sql).trim();
  if (!out) return [];
  const bubbles = {};
  for (const line of out.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [keyHex, valueHex] = trimmed.split('\t');
    const key = hexToUtf8(keyHex);
    const value = hexToUtf8(valueHex) ?? '';
    if (key) bubbles[key] = value;
  }
  return bubbles;
}

function findWorkspaceDb(projectPath) {
  if (!fs.existsSync(WS_DIR)) return null;
  for (const entry of fs.readdirSync(WS_DIR)) {
    const workspaceJson = path.join(WS_DIR, entry, 'workspace.json');
    const stateDb = path.join(WS_DIR, entry, 'state.vscdb');
    if (!fs.existsSync(workspaceJson) || !fs.existsSync(stateDb)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(workspaceJson, 'utf8'));
      const folder = data.folder || data.configuration?.folder || '';
      if (folder.includes(encodeURIComponent(projectPath)) || folder.includes(projectPath)) {
        return stateDb;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function main() {
  if (!fs.existsSync(GLOBAL_DB)) {
    console.error(`Global DB not found: ${GLOBAL_DB}`);
    process.exit(1);
  }

  const wsDb = findWorkspaceDb(PROJECT_PATH);
  if (!wsDb) {
    console.error(`Workspace DB not found for ${PROJECT_PATH}`);
    process.exit(1);
  }

  let composerData = readItemTableJson(wsDb, 'composer.composerData');
  let workspaceComposerIds = null;
  if (composerData?.selectedComposerIds?.length) {
    workspaceComposerIds = new Set(composerData.selectedComposerIds);
  }
  if (!composerData?.allComposers?.length) {
    composerData = readItemTableJson(GLOBAL_DB, 'composer.composerHeaders');
  }
  if (!composerData?.allComposers?.length) {
    console.error('No composer data found in workspace or global DB.');
    process.exit(1);
  }

  let allComposers = composerData.allComposers;
  if (workspaceComposerIds?.size) {
    allComposers = allComposers.filter((c) => c && workspaceComposerIds.has(c.composerId));
  }

  const composers = {};
  const bubbles = {};
  for (const composer of allComposers) {
    const id = composer.composerId;
    if (!id) continue;
    const value =
      readKv(wsDb, `composerData:${id}`) ??
      readKv(GLOBAL_DB, `composerData:${id}`);
    if (value != null) composers[id] = value;
    Object.assign(bubbles, readBubbles(wsDb, id));
    Object.assign(bubbles, readBubbles(GLOBAL_DB, id));
  }

  const exportObj = {
    exportedAt: new Date().toISOString(),
    workspacePath: PROJECT_PATH,
    allComposers,
    composers,
    bubbles,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(exportObj, null, 2), 'utf8');

  console.log(`✓ Exported ${allComposers.length} chats`);
  console.log(`  Composers with data: ${Object.keys(composers).length}`);
  console.log(`  Bubble entries: ${Object.keys(bubbles).length}`);
  console.log(`  File: ${OUT}`);
}

main();
