import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeImportHeader,
  formatBytesValue,
  formatIniSizeValue,
  formatExecutionTimeValue,
  detectCsvDelimiter,
  parseDelimitedText,
  parseCsvText,
  loadSqlTextFromFile,
  splitSqlStatements,
  parseExcelRows,
} from '../../../src/utils/import.js';

test('normalizeImportHeader trims, lowercases, and normalizes whitespace', () => {
  assert.equal(normalizeImportHeader('  User Name  '), 'user_name');
  assert.equal(normalizeImportHeader('EMAIL'), 'email');
});

test('formatBytesValue formats common thresholds and unlimited marker', () => {
  assert.equal(formatBytesValue(1024), '1.0 KB');
  assert.equal(formatBytesValue(15 * 1024 * 1024), '15 MB');
  assert.equal(formatBytesValue(-1, 'No limit'), 'No limit');
});

test('formatIniSizeValue and formatExecutionTimeValue produce readable labels', () => {
  assert.equal(formatIniSizeValue({ bytes: 2097152, raw: '2M' }), '2.0 MB (2M)');
  assert.equal(formatIniSizeValue(null), '--');
  assert.equal(formatExecutionTimeValue(30), '30s');
  assert.equal(formatExecutionTimeValue(0, 'Unlimited'), 'Unlimited');
  assert.equal(formatExecutionTimeValue('NaN'), '--');
});

test('detectCsvDelimiter chooses best delimiter candidate', () => {
  assert.equal(detectCsvDelimiter('id;name;email'), ';');
  assert.equal(detectCsvDelimiter('id\tname\temail'), '\t');
});

test('parseDelimitedText supports quoted delimiters and escaped quotes', () => {
  const parsed = parseDelimitedText('id,name\n1,"ali, ""veli"""', ',');
  assert.deepEqual(parsed, [
    ['id', 'name'],
    ['1', 'ali, "veli"'],
  ]);
});

test('parseCsvText removes BOM and empty rows', () => {
  const csv = '\uFEFFid,email\n1,a@example.com\n\n2,b@example.com\n';
  assert.deepEqual(parseCsvText(csv), [
    { id: '1', email: 'a@example.com' },
    { id: '2', email: 'b@example.com' },
  ]);
});

test('splitSqlStatements keeps semicolons inside quotes and comments', () => {
  const sql = `
    -- comment
    INSERT INTO users(name) VALUES('a;b');
    /* block ; comment */
    UPDATE users SET name = "x;y" WHERE id = 1;
  `;
  assert.deepEqual(splitSqlStatements(sql), [
    "-- comment\n    INSERT INTO users(name) VALUES('a;b')",
    '/* block ; comment */\n    UPDATE users SET name = "x;y" WHERE id = 1',
  ]);
});

test('loadSqlTextFromFile reads .sql file directly', async () => {
  const file = {
    name: 'dump.sql',
    text: async () => 'SELECT 1;',
  };
  const text = await loadSqlTextFromFile(file, {
    loadJsZip: async () => {
      throw new Error('should not load zip');
    },
    missingSqlError: 'missing',
    unsupportedFormatError: 'unsupported',
  });
  assert.equal(text, 'SELECT 1;');
});

test('loadSqlTextFromFile reads first sorted .sql entry from zip', async () => {
  const file = { name: 'dump.zip' };
  const text = await loadSqlTextFromFile(file, {
    loadJsZip: async () => ({
      loadAsync: async () => ({
        files: {
          'z-last.sql': { dir: false, name: 'z-last.sql', async: async () => 'SELECT 2;' },
          'a-first.sql': { dir: false, name: 'a-first.sql', async: async () => 'SELECT 1;' },
        },
      }),
    }),
    missingSqlError: 'missing',
    unsupportedFormatError: 'unsupported',
  });
  assert.equal(text, 'SELECT 1;');
});

test('loadSqlTextFromFile rejects unsupported formats', async () => {
  const file = { name: 'data.txt' };
  await assert.rejects(
    () =>
      loadSqlTextFromFile(file, {
        loadJsZip: async () => ({}),
        missingSqlError: 'missing',
        unsupportedFormatError: 'unsupported',
      }),
    /unsupported/,
  );
});

test('parseExcelRows maps sheet rows into trimmed-key objects', async () => {
  const file = {
    arrayBuffer: async () => new ArrayBuffer(8),
  };
  const rows = await parseExcelRows(file, {
    loadXlsx: async () => ({
      read: () => ({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      }),
      utils: {
        sheet_to_json: () => [{ ' User ': 'alice', age: 30 }],
      },
    }),
  });
  assert.deepEqual(rows, [{ User: 'alice', age: 30 }]);
});
