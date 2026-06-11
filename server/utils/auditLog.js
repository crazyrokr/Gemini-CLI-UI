import fs from 'fs';
import path from 'path';
import os from 'os';

const LOG_DIR = path.join(os.tmpdir(), 'gemini-cli-ui', 'audit');
let logStream = null;

function ensureLogStream() {
  if (!logStream) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `audit-${date}.ndjson`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }
  return logStream;
}

function auditLog(event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...details
  };
  try {
    const stream = ensureLogStream();
    stream.write(JSON.stringify(entry) + '\n');
  } catch {
    // Silently ignore log write failures — audit logging must not crash the server
  }
}

export { auditLog };
