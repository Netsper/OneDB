import React from 'react';
import { Code, Copy, Link as LinkIcon, Key, LayoutGrid, Plus, Trash2 } from 'lucide-react';

const SQL_KEYWORDS = new Set([
  'add',
  'alter',
  'and',
  'as',
  'asc',
  'by',
  'cascade',
  'check',
  'constraint',
  'create',
  'default',
  'delete',
  'desc',
  'drop',
  'exists',
  'false',
  'foreign',
  'from',
  'if',
  'in',
  'index',
  'insert',
  'into',
  'is',
  'key',
  'limit',
  'not',
  'null',
  'on',
  'or',
  'order',
  'primary',
  'references',
  'rename',
  'select',
  'set',
  'table',
  'to',
  'true',
  'unique',
  'update',
  'values',
  'view',
  'where',
]);

const SQL_TOKEN_REGEX =
  /(--.*$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|`(?:``|[^`])*`|"(?:[^"]|"")*"|\b\d+(?:\.\d+)?\b|\b[a-z_][a-z0-9_]*\b|[(),.;])/gim;

const highlightDdlSql = (sql) => {
  const text = String(sql || '');
  const tokens = [];
  let cursor = 0;
  let match;

  while ((match = SQL_TOKEN_REGEX.exec(text)) !== null) {
    const [value] = match;
    const { index } = match;

    if (index > cursor) {
      tokens.push({ type: 'plain', value: text.slice(cursor, index) });
    }

    const lower = value.toLowerCase();
    if (lower.startsWith('--') || lower.startsWith('/*')) {
      tokens.push({ type: 'comment', value });
    } else if (value.startsWith("'")) {
      tokens.push({ type: 'string', value });
    } else if (value.startsWith('`') || value.startsWith('"')) {
      tokens.push({ type: 'identifier', value });
    } else if (/^\d+(?:\.\d+)?$/.test(value)) {
      tokens.push({ type: 'number', value });
    } else if (/^[a-z_][a-z0-9_]*$/i.test(value) && SQL_KEYWORDS.has(lower)) {
      tokens.push({ type: 'keyword', value: value.toUpperCase() });
    } else if (/^[(),.;]$/.test(value)) {
      tokens.push({ type: 'punctuation', value });
    } else {
      tokens.push({ type: 'plain', value });
    }

    cursor = index + value.length;
  }

  if (cursor < text.length) {
    tokens.push({ type: 'plain', value: text.slice(cursor) });
  }

  return tokens;
};

const TOKEN_CLASS_MAP = {
  plain: 'text-zinc-200',
  keyword: 'text-fuchsia-300 font-semibold',
  string: 'text-amber-300',
  number: 'text-emerald-300',
  identifier: 'text-sky-300',
  comment: 'text-zinc-500 italic',
  punctuation: 'text-zinc-400',
};

export default function SchemaView({
  t,
  tc,
  activeTable,
  currentTableData,
  schemaViewMode,
  setSchemaViewMode,
  onAddColumn,
  getColumnIcon,
  ddl,
  copyToClipboard,
  onDropColumn,
}) {
  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-medium text-zinc-100">{t('tableSchema')}</h2>
          <p className="text-sm text-zinc-500">
            {t('manageCols')} <span className={tc.textLight}>{activeTable}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#333] bg-[#18181b] p-1">
            <button
              onClick={() => setSchemaViewMode('table')}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${schemaViewMode === 'table' ? `${tc.bg} text-white` : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> {t('tableView')}
            </button>
            <button
              onClick={() => setSchemaViewMode('ddl')}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${schemaViewMode === 'ddl' ? `${tc.bg} text-white` : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Code className="w-3.5 h-3.5" /> DDL
            </button>
          </div>
          {currentTableData.type !== 'view' && schemaViewMode === 'table' && (
            <button
              onClick={onAddColumn}
              className="bg-[#232323] border border-[#333] hover:bg-[#2e2e32] text-zinc-200 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> {t('addColumn')}
            </button>
          )}
          {schemaViewMode === 'ddl' && (
            <button
              onClick={() => copyToClipboard(ddl)}
              className="bg-[#232323] border border-[#333] hover:bg-[#2e2e32] text-zinc-200 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" /> {t('copy')}
            </button>
          )}
        </div>
      </div>

      {schemaViewMode === 'ddl' ? (
        <div className="bg-[#1c1c1c] border border-[#2e2e32] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2e2e32] bg-[#18181b] text-xs text-zinc-500">
            DDL
          </div>
          <pre className="p-4 text-sm overflow-auto font-mono leading-6 whitespace-pre-wrap break-words">
            {highlightDdlSql(ddl).map((token, index) => (
              <span
                key={`${token.type}-${index}`}
                className={TOKEN_CLASS_MAP[token.type] || TOKEN_CLASS_MAP.plain}
              >
                {token.value}
              </span>
            ))}
          </pre>
        </div>
      ) : (
        <div className="bg-[#1c1c1c] border border-[#2e2e32] rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#232323] text-zinc-400 border-b border-[#2e2e32]">
              <tr>
                <th className="px-5 py-3 font-medium">{t('colName')}</th>
                <th className="px-5 py-3 font-medium">{t('colType')}</th>
                <th className="px-5 py-3 font-medium">{t('colNullable')}</th>
                <th className="px-5 py-3 font-medium">{t('colDefault')}</th>
                <th className="px-5 py-3 font-medium">{t('colKey')}</th>
                <th className="px-5 py-3 font-medium text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e2e32]">
              {currentTableData.columns.map((col) => (
                <tr key={col.name} className="hover:bg-[#232323]/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {getColumnIcon(col.type)}
                      <span className="font-medium text-zinc-200">{col.name}</span>
                    </div>
                  </td>
                  <td className={`px-5 py-3 font-mono text-xs ${tc.textLightOpacity}`}>
                    {col.type}
                  </td>
                  <td className="px-5 py-3">
                    {col.nullable === 'Yes' ? (
                      <span className="text-zinc-500">{t('yes')}</span>
                    ) : (
                      <span className="text-zinc-300 font-medium">{t('no')}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs font-mono">
                    {col.extra?.includes('auto_increment') ? 'auto_increment' : col.extra || 'NULL'}
                  </td>
                  <td className="px-5 py-3 flex gap-2">
                    {col.isPrimary && (
                      <div className="bg-zinc-800 text-zinc-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                        <Key className="w-3 h-3 text-amber-500" /> PK
                      </div>
                    )}
                    {col.isForeign && (
                      <div
                        className="bg-blue-500/10 text-blue-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1"
                        title={`${col.foreignTable}.${col.foreignCol}`}
                      >
                        <LinkIcon className="w-3 h-3" /> FK
                      </div>
                    )}
                    {!col.isPrimary && !col.isForeign && '-'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {currentTableData.type !== 'view' && (
                      <button
                        onClick={() => onDropColumn(col.name)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        title={t('drop')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
