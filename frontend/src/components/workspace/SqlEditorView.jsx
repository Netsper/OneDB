import React, { useMemo, useState } from 'react';
import { autocompletion, completeFromList } from '@codemirror/autocomplete';
import { sql } from '@codemirror/lang-sql';
import { EditorView, lineNumbers } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import {
  Activity,
  AlignCenter,
  BookmarkPlus,
  Check,
  CircleDot,
  Download,
  GripHorizontal,
  History,
  Loader2,
  Play,
  Square,
  Sparkles,
  Undo2,
} from 'lucide-react';

const DEFAULT_SQL_EDITOR_SETTINGS = {
  syntaxHighlight: true,
  autocomplete: true,
  wordWrap: true,
  lineNumbers: true,
  fontSize: 13,
};

const SQL_COMPLETION_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'ORDER BY',
  'LIMIT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'VALUES',
  'INTO',
  'SET',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'OUTER JOIN',
  'ON',
  'AS',
  'DISTINCT',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'HAVING',
  'UNION',
  'CREATE',
  'ALTER',
  'DROP',
  'TABLE',
  'DATABASE',
  'INDEX',
  'VIEW',
  'EXPLAIN',
  'SHOW',
  'DESC',
];

export default function SqlEditorView({
  t,
  tc,
  sqlContainerRef,
  sqlResult,
  sqlEditorHeight,
  currentTableData,
  settings,
  handleAiGenerate,
  aiPrompt,
  setAiPrompt,
  isAiLoading,
  quoteIdentifier,
  activeTable,
  setSqlQuery,
  formatSql,
  saveSnippet,
  openSqlHistory,
  runSql,
  cancelRunningSql,
  beginTransactionDraft,
  commitTransactionDraft,
  rollbackTransactionDraft,
  isQueryRunning,
  transactionDraftActive,
  transactionDraftStatements,
  sqlQuery,
  handleSqlKeyDown,
  handleSplitterMouseDown,
  sqlResultTab,
  setSqlResultTab,
  exportToCSV,
  copyToClipboard,
}) {
  const [explainViewMode, setExplainViewMode] = useState('timeline');

  const sqlEditorSettings = {
    ...DEFAULT_SQL_EDITOR_SETTINGS,
    ...(settings?.sqlEditor || {}),
  };

  const editorSchema = useMemo(() => {
    const tableName = currentTableData?.name || activeTable;
    if (!tableName || !Array.isArray(currentTableData?.columns)) {
      return undefined;
    }

    return {
      [tableName]: currentTableData.columns.map((column) => column.name),
    };
  }, [activeTable, currentTableData]);

  const editorCompletions = useMemo(() => {
    const completionItems = SQL_COMPLETION_KEYWORDS.map((label) => ({ label, type: 'keyword' }));
    const tableName = currentTableData?.name || activeTable;

    if (tableName) {
      completionItems.push({ label: tableName, type: 'class', boost: 99 });
    }

    if (Array.isArray(currentTableData?.columns)) {
      currentTableData.columns.forEach((column) => {
        completionItems.push({ label: column.name, type: 'property' });
      });
    }

    return completionItems;
  }, [activeTable, currentTableData]);

  const editorExtensions = useMemo(() => {
    const extensions = [
      EditorView.theme(
        {
          '&': {
            height: '100%',
            fontSize: `${sqlEditorSettings.fontSize}px`,
            backgroundColor: '#18181b',
          },
          '.cm-content': {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
            padding: '12px 16px',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-gutters': {
            backgroundColor: '#18181b',
            borderRight: '1px solid #2e2e32',
            color: '#71717a',
          },
          '.cm-activeLineGutter, .cm-activeLine': {
            backgroundColor: 'transparent',
          },
          '.cm-tooltip': {
            backgroundColor: '#232326',
            borderColor: '#3f3f46',
          },
          '.cm-tooltip-autocomplete ul li[aria-selected]': {
            backgroundColor: '#0f766e',
            color: '#ecfeff',
          },
        },
        { dark: true },
      ),
      EditorView.domEventHandlers({
        keydown: (event) => {
          handleSqlKeyDown(event);
          return false;
        },
      }),
    ];

    if (sqlEditorSettings.lineNumbers) {
      extensions.push(lineNumbers());
    }

    if (sqlEditorSettings.wordWrap) {
      extensions.push(EditorView.lineWrapping);
    }

    if (sqlEditorSettings.syntaxHighlight) {
      extensions.push(sql({ schema: editorSchema }));
    }

    if (sqlEditorSettings.autocomplete) {
      extensions.push(
        autocompletion({
          activateOnTyping: true,
          override: [completeFromList(editorCompletions)],
          maxRenderedOptions: 20,
        }),
      );
    }

    return extensions;
  }, [
    editorCompletions,
    editorSchema,
    handleSqlKeyDown,
    sqlEditorSettings.autocomplete,
    sqlEditorSettings.fontSize,
    sqlEditorSettings.lineNumbers,
    sqlEditorSettings.syntaxHighlight,
    sqlEditorSettings.wordWrap,
  ]);

  const parsePlanMetric = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '-') return 0;
    if (raw.includes('..')) {
      const tail = raw.split('..').at(-1);
      const parsedRange = Number(String(tail || '').replace(/[^\d.]/g, ''));
      return Number.isFinite(parsedRange) ? parsedRange : 0;
    }
    const parsed = Number(raw.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const buildPlanMetrics = (steps) => {
    const items = (Array.isArray(steps) ? steps : []).map((item) => ({
      ...item,
      rowsValue: parsePlanMetric(item?.rows),
      costValue: parsePlanMetric(item?.cost),
      timeValue: parsePlanMetric(item?.time),
    }));

    const maxRows = Math.max(0, ...items.map((item) => item.rowsValue));
    const maxCost = Math.max(0, ...items.map((item) => item.costValue));
    const maxTime = Math.max(0, ...items.map((item) => item.timeValue));
    const totalRows = items.reduce((sum, item) => sum + item.rowsValue, 0);

    return { items, maxRows, maxCost, maxTime, totalRows };
  };

  const metricWidth = (value, max) => {
    if (max <= 0 || value <= 0) return '0%';
    return `${Math.max(4, Math.round((value / max) * 100))}%`;
  };

  const renderPlanTimeline = (steps) => {
    const { items, maxRows, maxCost, maxTime } = buildPlanMetrics(steps);
    return items.map((planItem, i) => (
      <div key={i} className="mb-3 rounded border border-[#2e2e32] bg-[#18181b] p-3">
        <div className="text-[11px] font-semibold text-zinc-200">
          {planItem.node} <span className="text-zinc-500">on</span>{' '}
          <span className="text-zinc-400">{planItem.entity}</span>
        </div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">{t('rows')}</div>
            <div className="text-[11px] text-zinc-200">{planItem.rows}</div>
            <div className="h-1.5 mt-1 rounded bg-[#222]">
              <div
                className="h-1.5 rounded bg-cyan-600/80"
                style={{ width: metricWidth(planItem.rowsValue, maxRows) }}
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">{t('cost')}</div>
            <div className="text-[11px] text-zinc-200">{planItem.cost}</div>
            <div className="h-1.5 mt-1 rounded bg-[#222]">
              <div
                className="h-1.5 rounded bg-amber-600/80"
                style={{ width: metricWidth(planItem.costValue, maxCost) }}
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">{t('time')}</div>
            <div className="text-[11px] text-zinc-200">{planItem.time}</div>
            <div className="h-1.5 mt-1 rounded bg-[#222]">
              <div
                className="h-1.5 rounded bg-emerald-600/80"
                style={{ width: metricWidth(planItem.timeValue, maxTime) }}
              />
            </div>
          </div>
        </div>
      </div>
    ));
  };

  const renderPlanTable = (steps) => (
    <div className="overflow-auto border border-[#2e2e32] rounded">
      <table className="min-w-full text-[11px] text-left">
        <thead className="bg-[#18181b] text-zinc-400 border-b border-[#2e2e32]">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">{t('planNode')}</th>
            <th className="px-3 py-2">{t('planEntity')}</th>
            <th className="px-3 py-2">{t('rows')}</th>
            <th className="px-3 py-2">{t('cost')}</th>
            <th className="px-3 py-2">{t('time')}</th>
          </tr>
        </thead>
        <tbody className="text-zinc-300">
          {(Array.isArray(steps) ? steps : []).map((item, index) => (
            <tr key={`${item.node}-${index}`} className="border-b border-[#242428] last:border-b-0">
              <td className="px-3 py-2 text-zinc-500">{index + 1}</td>
              <td className="px-3 py-2">{item.node}</td>
              <td className="px-3 py-2">{item.entity}</td>
              <td className="px-3 py-2">{item.rows}</td>
              <td className="px-3 py-2">{item.cost}</td>
              <td className="px-3 py-2">{item.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPlanRaw = (steps) => (
    <pre className="text-[11px] leading-relaxed text-zinc-300 bg-[#18181b] border border-[#2e2e32] rounded p-3 overflow-auto">
      {JSON.stringify(
        (Array.isArray(steps) ? steps : []).map((item) => item?.raw || item),
        null,
        2,
      )}
    </pre>
  );

  const renderPlanByMode = (steps) => {
    if (explainViewMode === 'table') return renderPlanTable(steps);
    if (explainViewMode === 'raw') return renderPlanRaw(steps);
    return renderPlanTimeline(steps);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#18181b]" ref={sqlContainerRef}>
      <div
        className="flex flex-col border-b border-[#2e2e32] bg-[#1c1c1c] shrink-0 min-h-[20%]"
        style={{ height: sqlResult ? `${sqlEditorHeight}%` : '100%' }}
      >
        <div className="px-4 py-2 border-b border-[#2e2e32] bg-[#1c1c1c]/50 flex items-center gap-3">
          <Sparkles className={`w-4 h-4 ${tc.text}`} />
          <form onSubmit={handleAiGenerate} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder={t('aiPlaceholder')}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className={`flex-1 bg-[#18181b] border border-[#333] hover:border-[#444] rounded text-xs py-1.5 px-3 text-zinc-200 transition-colors ${tc.focusRing}`}
            />
            <button
              disabled={isAiLoading || !aiPrompt.trim()}
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#232323] hover:bg-[#2e2e32] text-zinc-300 border border-[#333] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('aiGenerate')}
            </button>
          </form>
        </div>

        <div className="flex border-b border-[#2e2e32] p-2 gap-2 bg-[#18181b] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSqlQuery(`SELECT * FROM ${quoteIdentifier(activeTable)};`)}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded hover:bg-[#232323] transition-colors border border-transparent hover:border-[#333] shrink-0"
          >
            SELECT
          </button>
          <button
            onClick={() =>
              setSqlQuery(
                `INSERT INTO ${quoteIdentifier(activeTable)} (column_name) VALUES ('value');`,
              )
            }
            className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded hover:bg-[#232323] transition-colors border border-transparent hover:border-[#333] shrink-0"
          >
            INSERT
          </button>
          <button
            onClick={() =>
              setSqlQuery(
                `UPDATE ${quoteIdentifier(activeTable)} SET column_name='value' WHERE id=1;`,
              )
            }
            className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded hover:bg-[#232323] transition-colors border border-transparent hover:border-[#333] shrink-0"
          >
            UPDATE
          </button>
          <div className="flex-1" />
          <button
            onClick={formatSql}
            className="text-zinc-400 hover:text-zinc-200 text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shrink-0"
          >
            <AlignCenter className="w-3.5 h-3.5" /> {t('format')}
          </button>
          <button
            onClick={saveSnippet}
            className="text-zinc-400 hover:text-zinc-200 text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shrink-0"
          >
            <BookmarkPlus className="w-3.5 h-3.5" /> {t('saveSnippet')}
          </button>
          <button
            onClick={openSqlHistory}
            className="text-zinc-400 hover:text-zinc-200 text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shrink-0"
          >
            <History className="w-3.5 h-3.5" /> {t('historySaved')}
          </button>
          <div className="w-[1px] h-6 bg-[#333] shrink-0" />
          <button
            onClick={runSql}
            disabled={isQueryRunning}
            className={`${tc.bg} ${tc.hoverBg} text-white px-4 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed shrink-0`}
          >
            {isQueryRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            {t('run')}{' '}
            <span className="text-white/60 ml-1 font-normal tracking-widest text-[10px]">⌘↵</span>
          </button>
          {isQueryRunning && (
            <button
              onClick={cancelRunningSql}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#2a1f22] hover:bg-[#3a2529] text-rose-200 border border-rose-900/60 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              {t('cancelQuery')}
            </button>
          )}
          <div className="w-[1px] h-6 bg-[#333] shrink-0" />
          {!transactionDraftActive ? (
            <button
              onClick={beginTransactionDraft}
              className="px-3 py-1.5 rounded text-xs font-medium bg-[#1f2529] hover:bg-[#25313a] text-cyan-200 border border-cyan-900/60 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <CircleDot className="w-3.5 h-3.5" />
              {t('transactionBegin')}
            </button>
          ) : (
            <>
              <button
                onClick={commitTransactionDraft}
                disabled={isQueryRunning}
                className="px-3 py-1.5 rounded text-xs font-medium bg-[#1f2a22] hover:bg-[#253b2b] text-emerald-200 border border-emerald-900/60 transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                {t('transactionCommit')}
              </button>
              <button
                onClick={rollbackTransactionDraft}
                disabled={isQueryRunning}
                className="px-3 py-1.5 rounded text-xs font-medium bg-[#2a1f22] hover:bg-[#3a2529] text-rose-200 border border-rose-900/60 transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-60"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {t('transactionRollback')}
              </button>
              <span className="px-2 py-1 rounded border border-[#333] text-[10px] text-zinc-300 shrink-0">
                {t('transactionQueued').replace(
                  '{count}',
                  String(transactionDraftStatements.length || 0),
                )}
              </span>
            </>
          )}
        </div>

        <div className="flex-1 bg-[#18181b]">
          <CodeMirror
            value={sqlQuery}
            height="100%"
            theme="dark"
            extensions={editorExtensions}
            onChange={(value) => setSqlQuery(value)}
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLineGutter: false,
              highlightActiveLine: false,
              searchKeymap: true,
              autocompletion: false,
            }}
          />
        </div>
      </div>

      {sqlResult && (
        <div
          className="h-1 bg-[#2e2e32] hover:bg-[#444] cursor-row-resize shrink-0 flex items-center justify-center transition-colors"
          onMouseDown={handleSplitterMouseDown}
        >
          <GripHorizontal className="w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      )}

      {sqlResult && (
        <div className="flex-1 overflow-hidden flex flex-col bg-[#18181b]">
          <div className="px-6 border-b border-[#2e2e32] flex justify-between items-center bg-[#1c1c1c] shrink-0">
            <div className="flex gap-4">
              <button
                onClick={() => setSqlResultTab('data')}
                className={`py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${sqlResultTab === 'data' ? `${tc.border} ${tc.textLight}` : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
              >
                {t('dataTab')}
              </button>
              <button
                onClick={() => setSqlResultTab('explain')}
                className={`py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${sqlResultTab === 'explain' ? `${tc.border} ${tc.textLight}` : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
              >
                {t('explainTab')}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => exportToCSV(sqlResult.data, 'sorgu_sonucu')}
                className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <div className="w-[1px] h-3 bg-[#333]" />
              <span className="text-[10px] text-zinc-500 font-mono">
                ⏱ {sqlResult.time}s • {sqlResult.data.length} {t('rows')}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {sqlResultTab === 'data' ? (
              <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                <thead className="bg-[#1c1c1c] text-zinc-400 sticky top-0 z-10 shadow-sm border-b border-[#2e2e32]">
                  <tr>
                    <th className="px-4 py-1.5 w-10 border-r border-[#2e2e32] font-normal text-center text-zinc-600">
                      #
                    </th>
                    {sqlResult.columns.map((col) => (
                      <th
                        key={col.name}
                        className="px-4 py-1.5 border-r border-[#2e2e32] font-normal text-zinc-200"
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {sqlResult.data.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[#232323] border-b border-[#2e2e32] transition-colors"
                    >
                      <td className="px-4 py-1.5 border-r border-[#2e2e32] text-center text-zinc-600 text-xs">
                        {idx + 1}
                      </td>
                      {sqlResult.columns.map((col) => (
                        <td
                          key={col.name}
                          className="px-4 py-1.5 border-r border-[#2e2e32] text-xs font-mono"
                        >
                          {String(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4">
                <div className="bg-[#1c1c1c] border border-[#333] rounded-lg p-4 font-mono text-xs">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                      <Activity className="w-4 h-4 text-amber-500" /> {t('explainTab')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">
                        {sqlResult.plan?.length || 0} {t('planSteps')}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(
                              Array.isArray(sqlResult.plan)
                                ? sqlResult.plan.map((item) => item.raw || item)
                                : [],
                              null,
                              2,
                            ),
                          )
                        }
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 border border-[#333] rounded px-2 py-1 transition-colors"
                      >
                        {t('copyPlanJson')}
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setExplainViewMode('timeline')}
                      className={`px-2.5 py-1 rounded text-[10px] border transition-colors ${explainViewMode === 'timeline' ? `${tc.border} ${tc.textLight} bg-[#202124]` : 'border-[#333] text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {t('explainViewTimeline')}
                    </button>
                    <button
                      onClick={() => setExplainViewMode('table')}
                      className={`px-2.5 py-1 rounded text-[10px] border transition-colors ${explainViewMode === 'table' ? `${tc.border} ${tc.textLight} bg-[#202124]` : 'border-[#333] text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {t('explainViewTable')}
                    </button>
                    <button
                      onClick={() => setExplainViewMode('raw')}
                      className={`px-2.5 py-1 rounded text-[10px] border transition-colors ${explainViewMode === 'raw' ? `${tc.border} ${tc.textLight} bg-[#202124]` : 'border-[#333] text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {t('explainViewRaw')}
                    </button>
                  </div>
                  {sqlResult.plan && (
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="rounded border border-[#2e2e32] bg-[#18181b] px-3 py-2">
                        <div className="text-[10px] text-zinc-500 uppercase">{t('planSteps')}</div>
                        <div className="text-sm text-zinc-200">{sqlResult.plan.length}</div>
                      </div>
                      <div className="rounded border border-[#2e2e32] bg-[#18181b] px-3 py-2">
                        <div className="text-[10px] text-zinc-500 uppercase">
                          {t('explainSummaryRows')}
                        </div>
                        <div className="text-sm text-zinc-200">
                          {buildPlanMetrics(sqlResult.plan).totalRows}
                        </div>
                      </div>
                      <div className="rounded border border-[#2e2e32] bg-[#18181b] px-3 py-2">
                        <div className="text-[10px] text-zinc-500 uppercase">
                          {t('explainSummaryCost')}
                        </div>
                        <div className="text-sm text-zinc-200">
                          {buildPlanMetrics(sqlResult.plan).maxCost}
                        </div>
                      </div>
                    </div>
                  )}
                  {sqlResult.plan ? (
                    renderPlanByMode(sqlResult.plan)
                  ) : (
                    <div className="text-zinc-500">{t('noPlan')}</div>
                  )}

                  <div className="mt-4 pt-4 border-t border-[#2e2e32]">
                    <div className="text-zinc-300 font-semibold mb-3">
                      {t('explainCompareTitle')}
                    </div>
                    {sqlResult.planCompare ? (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="border border-[#2e2e32] rounded bg-[#18181b] p-3">
                          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-3">
                            {t('explainEstimated')}
                          </div>
                          {renderPlanByMode(sqlResult.planCompare.estimated)}
                        </div>
                        <div className="border border-[#2e2e32] rounded bg-[#18181b] p-3">
                          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-3">
                            {t('explainActual')}
                          </div>
                          {renderPlanByMode(sqlResult.planCompare.actual)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-zinc-500 text-xs">{t('explainCompareEmpty')}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
