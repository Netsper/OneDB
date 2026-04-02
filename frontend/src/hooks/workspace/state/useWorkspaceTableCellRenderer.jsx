import { useCallback } from 'react';

export default function useWorkspaceTableCellRenderer({ tc, isJsonColumn, getCellTextValue }) {
  return useCallback(
    (row, col) => {
      const val = row[col.name];
      if (val === null || val === '' || val === undefined) {
        return <span className="text-zinc-600 font-mono text-xs">NULL</span>;
      }

      if (
        col.type.includes('enum') ||
        col.type.includes('tinyint(1)') ||
        col.type.includes('bool')
      ) {
        let badgeClass = `${tc.badgeBg} ${tc.badgeText}`;
        if (
          val === 0 ||
          String(val).toLowerCase() === 'false' ||
          String(val).toLowerCase() === 'user' ||
          String(val).toLowerCase() === 'iptal'
        ) {
          badgeClass = 'bg-zinc-800 text-zinc-300';
        }
        if (String(val).toLowerCase() === 'admin' || String(val).toLowerCase() === 'bekliyor') {
          badgeClass = 'bg-rose-500/20 text-rose-300';
        }

        return (
          <span
            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border border-current opacity-80 ${badgeClass}`}
          >
            {String(val)}
          </span>
        );
      }

      if (col.type.includes('int') || col.type.includes('decimal')) {
        return <span className={`font-mono text-xs ${tc.textLightest}`}>{String(val)}</span>;
      }

      if (isJsonColumn(col)) {
        return <span className="text-sm font-mono text-zinc-300">{getCellTextValue(val)}</span>;
      }

      return <span className="text-sm">{String(val)}</span>;
    },
    [getCellTextValue, isJsonColumn, tc.badgeBg, tc.badgeText, tc.textLightest],
  );
}
