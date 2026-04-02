export const DB_PIN_PREFIX = 'db:';
export const TABLE_PIN_PREFIX = 'table:';

export function makeDatabasePinKey(dbName) {
  return `${DB_PIN_PREFIX}${dbName}`;
}

export function makeTablePinKey(dbName, tableName) {
  return `${TABLE_PIN_PREFIX}${dbName}.${tableName}`;
}

export function isDatabasePinKey(pinKey) {
  return String(pinKey || '').startsWith(DB_PIN_PREFIX);
}

export function isTablePinKey(pinKey) {
  return String(pinKey || '').startsWith(TABLE_PIN_PREFIX);
}

export function parseTablePinKey(pinKey) {
  const raw = String(pinKey || '').replace(TABLE_PIN_PREFIX, '');
  const separatorIndex = raw.indexOf('.');
  if (separatorIndex === -1) {
    return { dbName: raw, tableName: '' };
  }

  return {
    dbName: raw.slice(0, separatorIndex),
    tableName: raw.slice(separatorIndex + 1),
  };
}

export function parseDatabasePinKey(pinKey) {
  return String(pinKey || '').replace(DB_PIN_PREFIX, '');
}

export function normalizePinnedItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => {
          if (isDatabasePinKey(item) || isTablePinKey(item)) {
            return item;
          }

          if (item.includes('.')) {
            return `${TABLE_PIN_PREFIX}${item}`;
          }

          return `${DB_PIN_PREFIX}${item}`;
        }),
    ),
  );
}
