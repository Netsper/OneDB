import { useCallback } from 'react';

export default function useWorkspaceSqlDialectHelpers(connForm) {
  const currentDriver = connForm?.driver === 'pgsql' ? 'pgsql' : 'mysql';

  const quoteIdentifier = useCallback(
    (name) => {
      if (currentDriver === 'mysql') {
        return `\`${String(name).replace(/`/g, '``')}\``;
      }
      return `"${String(name).replace(/"/g, '""')}"`;
    },
    [currentDriver],
  );

  const escapeLiteral = useCallback((value) => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? '1' : '0';
    return `'${String(value).replace(/'/g, "''")}'`;
  }, []);

  return {
    currentDriver,
    quoteIdentifier,
    escapeLiteral,
  };
}
