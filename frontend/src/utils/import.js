export const normalizeImportHeader = (header) =>
  String(header || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

export const formatBytesValue = (bytes, unlimitedLabel = 'Unlimited') => {
  if (bytes === null || bytes === undefined) return '--';
  if (bytes < 0) return unlimitedLabel;

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Number(bytes);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
};

export const formatIniSizeValue = (entry, unlimitedLabel = 'Unlimited') => {
  if (!entry) return '--';
  const pretty = formatBytesValue(entry.bytes, unlimitedLabel);
  const raw = String(entry.raw ?? '').trim();
  if (raw === '') return pretty;
  return `${pretty} (${raw})`;
};

export const formatExecutionTimeValue = (seconds, unlimitedLabel = 'Unlimited') => {
  if (seconds === null || seconds === undefined) return '--';
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) return '--';
  if (numeric <= 0) return unlimitedLabel;
  return `${numeric}s`;
};

export const detectCsvDelimiter = (line) => {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;

  candidates.forEach((delimiter) => {
    const count = line.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  });

  return best;
};

export const parseDelimitedText = (content, delimiter) => {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1] || '';

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(value);
      value = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  rows.push(row);
  return rows;
};

export const parseCsvText = (content) => {
  const normalizedContent = String(content || '').replace(/^\uFEFF/, '');
  const firstLine = normalizedContent.split(/\r?\n/).find((line) => line.trim() !== '') || '';
  const delimiter = detectCsvDelimiter(firstLine);
  const table = parseDelimitedText(normalizedContent, delimiter).map((cells) =>
    cells.map((cell) => String(cell || '').trim()),
  );

  if (table.length === 0 || table[0].every((cell) => cell === '')) {
    return [];
  }

  const headers = table[0];
  const rows = [];

  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const cells = table[rowIndex];
    if (cells.every((cell) => cell === '')) continue;

    const row = {};
    headers.forEach((header, headerIndex) => {
      if (header === '') return;
      row[header] = cells[headerIndex] ?? '';
    });
    rows.push(row);
  }

  return rows;
};

export const readSqlFromZipFile = async (file, { loadJsZip, missingSqlError }) => {
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(file);
  const sqlCandidates = Object.values(zip.files)
    .filter((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (sqlCandidates.length === 0) {
    throw new Error(missingSqlError);
  }

  return sqlCandidates[0].async('string');
};

export const loadSqlTextFromFile = async (
  file,
  { loadJsZip, missingSqlError, unsupportedFormatError },
) => {
  const fileName = String(file?.name || '').toLowerCase();
  if (fileName.endsWith('.sql')) {
    return file.text();
  }
  if (fileName.endsWith('.zip')) {
    return readSqlFromZipFile(file, { loadJsZip, missingSqlError });
  }
  throw new Error(unsupportedFormatError);
};

export const splitSqlStatements = (sqlText) => {
  const input = String(sqlText || '');
  const statements = [];
  let buffer = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1] || '';
    const prev = input[index - 1] || '';

    if (inLineComment) {
      buffer += char;
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      buffer += char;
      if (char === '*' && next === '/') {
        buffer += next;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === '-' && next === '-') {
        buffer += char;
        inLineComment = true;
        continue;
      }
      if (char === '/' && next === '*') {
        buffer += char;
        inBlockComment = true;
        continue;
      }
    }

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      if (inSingleQuote && next === "'") {
        buffer += `${char}${next}`;
        index += 1;
        continue;
      }
      if (!inSingleQuote || prev !== '\\') {
        inSingleQuote = !inSingleQuote;
      }
      buffer += char;
      continue;
    }

    if (char === '"' && !inSingleQuote && !inBacktick) {
      if (inDoubleQuote && next === '"') {
        buffer += `${char}${next}`;
        index += 1;
        continue;
      }
      if (!inDoubleQuote || prev !== '\\') {
        inDoubleQuote = !inDoubleQuote;
      }
      buffer += char;
      continue;
    }

    if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      buffer += char;
      continue;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const statement = buffer.trim();
      if (statement !== '') statements.push(statement);
      buffer = '';
      continue;
    }

    buffer += char;
  }

  const tail = buffer.trim();
  if (tail !== '') statements.push(tail);
  return statements;
};

export const parseExcelRows = async (file, { loadXlsx }) => {
  const buffer = await file.arrayBuffer();
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const [firstSheetName] = workbook.SheetNames;
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  return rawRows.map((row) =>
    Object.keys(row).reduce((next, key) => {
      next[String(key).trim()] = row[key];
      return next;
    }, {}),
  );
};
