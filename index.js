const initSqlJs = require('sql.js');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DB_PATH = path.join(os.homedir(), 'Library', 'Application Support', 'mochi', 'mochi.db');

async function withDb(fn) {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  try {
    const result = fn(db);
    fs.writeFileSync(DB_PATH, db.export());
    return result;
  } finally {
    db.close();
  }
}

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = crypto.randomBytes(8);
  for (const byte of bytes) {
    id += chars[byte % chars.length];
  }
  return id;
}

function generateRev(jsonStr) {
  const hash = crypto.createHash('md5').update(jsonStr).digest('hex');
  return `1-${hash}`;
}

function insertDocument(db, docId, jsonObj) {
  const jsonStr = JSON.stringify(jsonObj);
  const rev = generateRev(jsonStr);
  const revHash = rev.slice(2); // strip "1-"

  db.run(
    `INSERT INTO "by-sequence" (json, deleted, doc_id, rev) VALUES (?, 0, ?, ?)`,
    [jsonStr, docId, rev]
  );

  const [[seq]] = db.exec(`SELECT last_insert_rowid()`)[0].values;

  const revTree = JSON.stringify({
    id: docId,
    rev_tree: [{ pos: 1, ids: [revHash, { status: 'available' }, []] }],
    seq,
  });

  db.run(
    `INSERT OR REPLACE INTO "document-store" (id, json, winningseq, max_seq) VALUES (?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER))`,
    [docId, revTree, seq, seq]
  );

  return { seq, rev };
}

function getMaxDeckSort(db) {
  const result = db.exec(
    `SELECT json FROM "by-sequence" WHERE deleted = 0 AND json LIKE '%"type":"deck"%'`
  );
  if (!result.length) return 0;

  let max = 0;
  for (const [jsonStr] of result[0].values) {
    try {
      const doc = JSON.parse(jsonStr);
      const sort = doc['transit-data']?.['~:sort'];
      if (typeof sort === 'number' && sort > max) max = sort;
    } catch {}
  }
  return max;
}

async function addDeck(name) {
  const docId = generateId();
  return withDb((db) => {
    const sort = getMaxDeckSort(db) + 1;
    const doc = {
      type: 'deck',
      'transit-data': {
        '~:id': `~:${docId}`,
        '~:name': name,
        '~:sort': sort,
        '~:template-id': null,
        '~:show-sides?': true,
        '~:settings': { '~:show-sides?': true },
      },
    };
    insertDocument(db, docId, doc);
    return { id: docId, name };
  });
}

async function addCard({ front, back, deckId }) {
  const docId = generateId();
  const now = Date.now();
  const content = back ? `${front}\n---\n${back}` : front;

  const doc = {
    'transit-data': {
      '~:updated-at': { '~#dt': now },
      '~:tags': { '~#set': [] },
      '~:content': content,
      '~:name': front,
      '~:deck-id': `~:${deckId}`,
      '~:cloze/indexes': { '~#set': [] },
      '~:pos': 'U',
      '~:references': { '~#set': [] },
      '~:id': `~:${docId}`,
      '~:reviews': [],
      '~:created-at': { '~#dt': now },
      '~:new?': false,
      '~:template-id': null,
    },
    type: 'card',
  };

  return withDb((db) => {
    insertDocument(db, docId, doc);
    return { id: docId, front, deckId };
  });
}

async function getDecks() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  try {
    const result = db.exec(
      `SELECT doc_id, json FROM "by-sequence"
       WHERE deleted = 0 AND json LIKE '%"type":"deck"%'
       ORDER BY seq`
    );
    if (!result.length) return [];
    return result[0].values
      .map(([docId, jsonStr]) => {
        try {
          const doc = JSON.parse(jsonStr);
          const td = doc['transit-data'];
          if (td?.['~:trashed?'] || td?.['~:archived?'] === true) return null;
          return { id: docId, name: td?.['~:name'] ?? docId };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } finally {
    db.close();
  }
}

module.exports = { addDeck, addCard, getDecks };
