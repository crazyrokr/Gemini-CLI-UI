// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INIT_SQL_PATH = path.join(__dirname, '../../../server/database/init.sql');
const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');

function createTestDb() {
  const db = new Database(':memory:');
  db.exec(initSQL);
  return db;
}

function createUserDb(db) {
  return {
    hasUsers: () => {
      const row = db.prepare('SELECT COUNT(*) as count FROM geminicliui_users').get();
      return row.count > 0;
    },
    createUser: (username, passwordHash) => {
      const stmt = db.prepare('INSERT INTO geminicliui_users (username, password_hash) VALUES (?, ?)');
      const result = stmt.run(username, passwordHash);
      return { id: result.lastInsertRowid, username };
    },
    getUserByUsername: (username) => {
      return db.prepare('SELECT * FROM geminicliui_users WHERE username = ? AND is_active = 1').get(username);
    },
    updateLastLogin: (userId) => {
      db.prepare('UPDATE geminicliui_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    },
    getUserById: (userId) => {
      return db.prepare('SELECT id, username, created_at, last_login FROM geminicliui_users WHERE id = ? AND is_active = 1').get(userId);
    },
  };
}

describe('Database module', () => {
  let db;
  let userDb;

  beforeEach(() => {
    db = createTestDb();
    userDb = createUserDb(db);
  });

  describe('initializeDatabase', () => {
    it('creates the geminicliui_users table with correct schema', () => {
      // Given — a fresh in-memory database with init.sql applied (done in createTestDb)

      // When — inspect the table info
      const columns = db.prepare('PRAGMA table_info(geminicliui_users)').all();
      const columnNames = columns.map(c => c.name);

      // Then — all expected columns exist
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('password_hash');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('last_login');
      expect(columnNames).toContain('is_active');
    });

    it('creates the expected indexes', () => {
      // Given — database initialized with init.sql

      // When — query index list
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
      const indexNames = indexes.map(i => i.name);

      // Then — both expected indexes exist
      expect(indexNames).toContain('idx_geminicliui_users_username');
      expect(indexNames).toContain('idx_geminicliui_users_active');
    });

    it('is idempotent — running init.sql twice does not error', () => {
      // Given — database already initialized
      // When — run init.sql again
      // Then — no error thrown
      expect(() => db.exec(initSQL)).not.toThrow();
    });
  });

  describe('hasUsers', () => {
    it('returns false when no users exist', () => {
      // Given — empty database
      // When
      const result = userDb.hasUsers();
      // Then
      expect(result).toBe(false);
    });

    it('returns true after a user is created', () => {
      // Given — a user inserted directly
      db.prepare('INSERT INTO geminicliui_users (username, password_hash) VALUES (?, ?)').run('alice', 'hash');

      // When
      const result = userDb.hasUsers();

      // Then
      expect(result).toBe(true);
    });
  });

  describe('createUser', () => {
    it('inserts a user and returns id and username', () => {
      // Given — empty database

      // When
      const result = userDb.createUser('bob', 'hashed_pw');

      // Then
      expect(result).toEqual({ id: 1, username: 'bob' });
      const row = db.prepare('SELECT * FROM geminicliui_users WHERE username = ?').get('bob');
      expect(row.password_hash).toBe('hashed_pw');
      expect(row.is_active).toBe(1);
    });

    it('auto-increments the id for successive users', () => {
      // Given — empty database

      // When
      const first = userDb.createUser('user1', 'hash1');
      const second = userDb.createUser('user2', 'hash2');

      // Then
      expect(second.id).toBe(first.id + 1);
    });

    it('throws on duplicate username', () => {
      // Given — a user already exists
      userDb.createUser('dup', 'hash');

      // When / Then
      expect(() => userDb.createUser('dup', 'hash2')).toThrow(/UNIQUE constraint failed/);
    });
  });

  describe('getUserByUsername', () => {
    it('returns the user row when user exists and is active', () => {
      // Given
      userDb.createUser('charlie', 'secret');

      // When
      const result = userDb.getUserByUsername('charlie');

      // Then
      expect(result).toBeDefined();
      expect(result.username).toBe('charlie');
      expect(result.password_hash).toBe('secret');
      expect(result.is_active).toBe(1);
    });

    it('returns undefined when user does not exist', () => {
      // Given — empty database

      // When
      const result = userDb.getUserByUsername('nobody');

      // Then
      expect(result).toBeUndefined();
    });

    it('returns undefined when user is deactivated (is_active = 0)', () => {
      // Given
      userDb.createUser('inactive', 'hash');
      db.prepare('UPDATE geminicliui_users SET is_active = 0 WHERE username = ?').run('inactive');

      // When
      const result = userDb.getUserByUsername('inactive');

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('getUserById', () => {
    it('returns user without password_hash when user exists', () => {
      // Given
      const { id } = userDb.createUser('dave', 'pw123');

      // When
      const result = userDb.getUserById(id);

      // Then
      expect(result).toBeDefined();
      expect(result.id).toBe(id);
      expect(result.username).toBe('dave');
      expect(result).not.toHaveProperty('password_hash');
      expect(result).toHaveProperty('created_at');
    });

    it('returns undefined when user does not exist', () => {
      // Given — empty database

      // When
      const result = userDb.getUserById(999);

      // Then
      expect(result).toBeUndefined();
    });

    it('returns undefined when user is deactivated', () => {
      // Given
      const { id } = userDb.createUser('ghost', 'hash');
      db.prepare('UPDATE geminicliui_users SET is_active = 0 WHERE id = ?').run(id);

      // When
      const result = userDb.getUserById(id);

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('updateLastLogin', () => {
    it('sets last_login to a non-null timestamp', () => {
      // Given
      const { id } = userDb.createUser('loginuser', 'hash');

      // When
      userDb.updateLastLogin(id);

      // Then
      const row = db.prepare('SELECT last_login FROM geminicliui_users WHERE id = ?').get(id);
      expect(row.last_login).not.toBeNull();
    });

    it('updates last_login on subsequent calls', async () => {
      // Given
      const { id } = userDb.createUser('timetest', 'hash');
      userDb.updateLastLogin(id);
      const first = db.prepare('SELECT last_login FROM geminicliui_users WHERE id = ?').get(id).last_login;

      // Small delay to ensure timestamp differs
      await new Promise(r => setTimeout(r, 10));

      // When
      userDb.updateLastLogin(id);
      const second = db.prepare('SELECT last_login FROM geminicliui_users WHERE id = ?').get(id).last_login;

      // Then
      expect(second).not.toBeNull();
      // Both are ISO timestamps; second should be >= first
      expect(new Date(second).getTime()).toBeGreaterThanOrEqual(new Date(first).getTime());
    });

    it('does not throw when user id does not exist (no-op)', () => {
      // Given — no user with id 999

      // When / Then
      expect(() => userDb.updateLastLogin(999)).not.toThrow();
    });
  });

  describe('better-sqlite3 compatibility', () => {
    it('lastInsertRowid returns correct value after insert', () => {
      // Given — the core API surface that db.js relies on
      const stmt = db.prepare('INSERT INTO geminicliui_users (username, password_hash) VALUES (?, ?)');

      // When
      const result = stmt.run('compat_test', 'hash');

      // Then — same property used in createUser
      expect(result.lastInsertRowid).toBe(1);
    });

    it('prepare().get() returns undefined for no match', () => {
      // Given
      const stmt = db.prepare('SELECT * FROM geminicliui_users WHERE username = ?');

      // When
      const result = stmt.get('nonexistent');

      // Then
      expect(result).toBeUndefined();
    });
  });
});
