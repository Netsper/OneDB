import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

function normalizeRawJsonText(rawValue, formattedValue) {
  const formatted = String(formattedValue || '').trim();
  if (formatted !== '') {
    return formatted;
  }

  if (rawValue === null) return 'null';
  if (rawValue === undefined) return '';
  if (typeof rawValue === 'string') return rawValue;
  if (typeof rawValue === 'object') {
    try {
      return JSON.stringify(rawValue, null, 2);
    } catch {
      return String(rawValue);
    }
  }
  return String(rawValue);
}

function parseJsonValue(rawValue, fallbackRawText) {
  if (rawValue && typeof rawValue === 'object') {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    try {
      return JSON.parse(rawValue);
    } catch {
      return null;
    }
  }

  if (typeof fallbackRawText === 'string' && fallbackRawText.trim() !== '') {
    try {
      return JSON.parse(fallbackRawText);
    } catch {
      return null;
    }
  }

  return null;
}

function PrimitiveValue({ value }) {
  if (value === null) {
    return <span className="text-red-300">null</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-zinc-100">"{value}"</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-zinc-300">{String(value)}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-amber-300">{String(value)}</span>;
  }
  return <span className="text-zinc-300">{String(value)}</span>;
}

function JsonTreeNode({ label, value, path, expandedPaths, togglePath }) {
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object' && !isArray;
  const isExpandable = isArray || isObject;
  const isExpanded = expandedPaths.has(path);
  const entries = isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value || {});

  return (
    <div className="text-xs font-mono leading-6">
      <div className="flex items-start gap-1">
        {isExpandable ? (
          <button
            type="button"
            onClick={() => togglePath(path)}
            className="text-zinc-400 hover:text-zinc-200 mt-1"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 h-3.5 mt-1" />
        )}

        <div className="min-w-0">
          {label !== null && <span className="text-blue-300">"{label}"</span>}
          {label !== null && <span className="text-zinc-500">: </span>}
          {isExpandable ? (
            <span className="text-zinc-300">
              {isArray ? `[${entries.length}]` : `{${entries.length}}`}
            </span>
          ) : (
            <PrimitiveValue value={value} />
          )}
        </div>
      </div>

      {isExpandable && isExpanded && (
        <div className="ml-5 border-l border-[#34343a] pl-3">
          {entries.length === 0 ? (
            <div className="text-zinc-500 text-xs py-0.5">empty</div>
          ) : (
            entries.map(([childLabel, childValue]) => (
              <JsonTreeNode
                key={`${path}.${childLabel}`}
                label={childLabel}
                value={childValue}
                path={`${path}.${childLabel}`}
                expandedPaths={expandedPaths}
                togglePath={togglePath}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function collectExpandablePaths(value, path = '$') {
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object' && !isArray;
  if (!isArray && !isObject) {
    return [];
  }

  const entries = isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value || {});

  return entries.reduce(
    (acc, [key, child]) => [
      ...acc,
      `${path}.${key}`,
      ...collectExpandablePaths(child, `${path}.${key}`),
    ],
    [path],
  );
}

export default function JsonViewerModal({
  t,
  tc,
  isOpen,
  onClose,
  columnName,
  formattedValue,
  rawValue,
  defaultMode = 'tree',
  copyToClipboard,
}) {
  const [viewMode, setViewMode] = useState(defaultMode === 'raw' ? 'raw' : 'tree');
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['$']));

  const rawJsonText = useMemo(
    () => normalizeRawJsonText(rawValue, formattedValue),
    [formattedValue, rawValue],
  );
  const parsedJson = useMemo(() => parseJsonValue(rawValue, rawJsonText), [rawJsonText, rawValue]);
  const expandablePaths = useMemo(
    () => (parsedJson !== null ? collectExpandablePaths(parsedJson) : []),
    [parsedJson],
  );
  const areAllTreeNodesExpanded = useMemo(
    () => expandablePaths.length > 0 && expandablePaths.every((path) => expandedPaths.has(path)),
    [expandablePaths, expandedPaths],
  );

  useEffect(() => {
    if (isOpen) {
      setViewMode(defaultMode === 'raw' ? 'raw' : 'tree');
      setExpandedPaths(new Set(['$']));
    }
  }, [defaultMode, isOpen]);

  const togglePath = (path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleAllTreeNodes = () => {
    if (!parsedJson) return;
    if (areAllTreeNodesExpanded) {
      setExpandedPaths(new Set(['$']));
      return;
    }
    setExpandedPaths(new Set(expandablePaths));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-[#333] rounded-xl w-full max-w-3xl flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2e2e32] flex justify-between items-center bg-[#18181b]">
          <div>
            <h3 className="text-base font-medium text-zinc-100">{t('viewJson')}</h3>
            <p className="text-xs text-zinc-500 mt-1">{columnName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-[#121215] border border-[#323239] rounded-md p-0.5 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-2 py-1 text-[11px] rounded transition-colors ${
                  viewMode === 'tree' ? `${tc.bg} text-white` : 'text-zinc-300 hover:bg-[#2a2a2f]'
                }`}
              >
                {t('settingsJsonModeTree')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-2 py-1 text-[11px] rounded transition-colors ${
                  viewMode === 'raw' ? `${tc.bg} text-white` : 'text-zinc-300 hover:bg-[#2a2a2f]'
                }`}
              >
                {t('settingsJsonModeRaw')}
              </button>
            </div>
            {viewMode === 'tree' && parsedJson !== null ? (
              <button
                type="button"
                onClick={toggleAllTreeNodes}
                className="px-2.5 py-1 text-[11px] rounded border border-[#323239] text-zinc-300 hover:bg-[#2a2a2f] transition-colors"
              >
                {areAllTreeNodesExpanded ? t('collapseAll') : t('expandAll')}
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-[#333] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {viewMode === 'tree' ? (
            parsedJson !== null ? (
              <div className="max-h-[60vh] overflow-auto bg-[#18181b] border border-[#333] rounded-lg p-4 text-zinc-200">
                <JsonTreeNode
                  label={null}
                  value={parsedJson}
                  path="$"
                  expandedPaths={expandedPaths}
                  togglePath={togglePath}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-amber-300 bg-amber-400/10 border border-amber-500/30 rounded px-3 py-2">
                  {t('jsonInvalidFallback')}
                </div>
                <pre className="max-h-[60vh] overflow-auto bg-[#18181b] border border-[#333] rounded-lg p-4 text-xs text-zinc-200 whitespace-pre-wrap break-all">
                  {rawJsonText}
                </pre>
              </div>
            )
          ) : (
            <pre className="max-h-[60vh] overflow-auto bg-[#18181b] border border-[#333] rounded-lg p-4 text-xs text-zinc-200 whitespace-pre-wrap break-all">
              {rawJsonText}
            </pre>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#2e2e32] bg-[#18181b] flex justify-end gap-2">
          <button
            type="button"
            onClick={() => copyToClipboard(rawJsonText)}
            className="px-4 py-2 text-xs font-medium text-zinc-300 border border-[#333] hover:bg-[#2e2e32] rounded"
          >
            {t('copy')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-medium text-white ${tc.bg} ${tc.hoverBg} rounded`}
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
