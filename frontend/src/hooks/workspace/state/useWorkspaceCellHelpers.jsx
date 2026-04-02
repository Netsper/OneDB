import { useCallback, useMemo } from 'react';
import { Calendar, Hash, ToggleLeft, Type } from 'lucide-react';

export default function useWorkspaceCellHelpers({ lang }) {
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }),
    [lang],
  );

  const getColumnIcon = useCallback((type) => {
    const normalizedType = type?.toLowerCase() || '';
    if (
      normalizedType.includes('int') ||
      normalizedType.includes('decimal') ||
      normalizedType.includes('float')
    )
      return <Hash className="w-3.5 h-3.5 text-zinc-500" />;
    if (
      normalizedType.includes('datetime') ||
      normalizedType.includes('date') ||
      normalizedType.includes('time')
    )
      return <Calendar className="w-3.5 h-3.5 text-zinc-500" />;
    if (
      normalizedType.includes('enum') ||
      normalizedType.includes('tinyint') ||
      normalizedType.includes('bool')
    )
      return <ToggleLeft className="w-3.5 h-3.5 text-zinc-500" />;
    return <Type className="w-3.5 h-3.5 text-zinc-500" />;
  }, []);

  const getCellTextValue = useCallback((value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }, []);

  const isJsonColumn = useCallback(
    (col) =>
    String(col?.type || '')
      .toLowerCase()
      .includes('json'),
    [],
  );

  const parseJsonCellValue = useCallback((value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }, []);

  const formatJsonCellValue = useCallback(
    (value) => {
      const parsed = parseJsonCellValue(value);
      if (parsed === null) return '';
      return JSON.stringify(parsed, null, 2);
    },
    [parseJsonCellValue],
  );

  const isTimestampColumn = useCallback((col) => {
    const type = String(col?.type || '').toLowerCase();
    return (
      type.includes('timestamp') ||
      type.includes('datetime') ||
      type === 'date' ||
      /_at$/i.test(String(col?.name || ''))
    );
  }, []);

  const parseTimestampValue = useCallback((value) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    const raw = String(value).trim();
    if (raw === '') return null;

    if (/^\d{10,13}$/.test(raw)) {
      const numeric = Number(raw);
      const millis = raw.length === 10 ? numeric * 1000 : numeric;
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }, []);

  const getTimestampTooltip = useCallback(
    (value, col) => {
      if (!isTimestampColumn(col)) return '';
      const date = parseTimestampValue(value);
      if (!date) return '';
      return dateTimeFormatter.format(date);
    },
    [dateTimeFormatter, isTimestampColumn, parseTimestampValue],
  );

  return {
    getColumnIcon,
    getCellTextValue,
    isJsonColumn,
    parseJsonCellValue,
    formatJsonCellValue,
    getTimestampTooltip,
  };
}
