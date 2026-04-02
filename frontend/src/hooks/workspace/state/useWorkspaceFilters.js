import { useCallback, useMemo } from 'react';

export const isNumericColumnType = (col) => {
  const type = String(col?.type || '').toLowerCase();
  return (
    type.includes('int') ||
    type.includes('decimal') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('numeric') ||
    type.includes('real')
  );
};

export const isTemporalColumnType = (col) => {
  const type = String(col?.type || '').toLowerCase();
  return type.includes('date') || type.includes('time') || type.includes('year');
};

export const buildFilterOperatorOptions = (
  col,
  t,
  isNumeric = isNumericColumnType,
  isTemporal = isTemporalColumnType,
) => {
  if (isNumeric(col) || isTemporal(col)) {
    return [
      { value: 'eq', label: t('equals') },
      { value: 'neq', label: t('notEquals') },
      { value: 'gt', label: t('greaterThan') },
      { value: 'lt', label: t('lessThan') },
    ];
  }

  return [
    { value: 'contains', label: t('contains') },
    { value: 'starts_with', label: t('startsWith') },
    { value: 'ends_with', label: t('endsWith') },
    { value: 'eq', label: t('equals') },
    { value: 'neq', label: t('notEquals') },
  ];
};

export const normalizeFilterRuleDraftsList = (drafts, generateId) =>
  (Array.isArray(drafts) ? drafts : []).reduce((list, rule) => {
    if (!rule || typeof rule !== 'object') return list;
    const column = String(rule.column || '').trim();
    const value = String(rule.value ?? '').trim();
    if (column === '' || value === '') return list;

    list.push({
      id: String(rule.id || generateId()),
      column,
      operator: String(rule.operator || 'contains'),
      value,
    });
    return list;
  }, []);

export default function useWorkspaceFilters({
  t,
  currentTableData,
  filterRules,
  setFilterRules,
  filterRuleDrafts,
  setFilterRuleDrafts,
  setIsFilterPanelOpen,
  serverColumnFilters,
  setServerColumnFilters,
  setPage,
  columnMenu,
  setColumnMenu,
}) {
  const currentColumns = useMemo(() => currentTableData?.columns || [], [currentTableData]);

  const isNumericColumn = useCallback((col) => isNumericColumnType(col), []);

  const isTemporalColumn = useCallback((col) => isTemporalColumnType(col), []);

  const getFilterOperatorOptions = useCallback(
    (col) => buildFilterOperatorOptions(col, t, isNumericColumn, isTemporalColumn),
    [isNumericColumn, isTemporalColumn, t],
  );

  const generateFilterRuleId = useCallback(
    () => `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const getDefaultRuleForColumn = useCallback(
    (columnName = '') => {
      const fallbackColumn = currentColumns[0]?.name || '';
      const resolvedColumnName = columnName || fallbackColumn;
      const selectedColumn =
        currentColumns.find((col) => col.name === resolvedColumnName) || currentColumns[0] || null;
      const options = getFilterOperatorOptions(selectedColumn || {});

      return {
        id: generateFilterRuleId(),
        column: resolvedColumnName,
        operator: options[0]?.value || 'contains',
        value: '',
      };
    },
    [currentColumns, generateFilterRuleId, getFilterOperatorOptions],
  );

  const normalizeFilterRuleDrafts = useCallback(
    (drafts) => normalizeFilterRuleDraftsList(drafts, generateFilterRuleId),
    [generateFilterRuleId],
  );

  const addFilterRuleDraft = useCallback(() => {
    if (currentColumns.length === 0) return;
    setFilterRuleDrafts((prev) => [...prev, getDefaultRuleForColumn()]);
  }, [currentColumns.length, getDefaultRuleForColumn, setFilterRuleDrafts]);

  const updateFilterRuleDraft = useCallback(
    (ruleId, patch) => {
      setFilterRuleDrafts((prev) =>
        prev.map((rule) => {
          if (rule.id !== ruleId) return rule;

          const nextRule = { ...rule, ...patch };
          if (patch.column !== undefined) {
            const selectedColumn = currentColumns.find((col) => col.name === nextRule.column);
            const operatorOptions = getFilterOperatorOptions(selectedColumn || {});
            const hasOperator = operatorOptions.some(
              (option) => option.value === nextRule.operator,
            );
            if (!hasOperator) {
              nextRule.operator = operatorOptions[0]?.value || 'contains';
            }
          }

          return nextRule;
        }),
      );
    },
    [currentColumns, getFilterOperatorOptions, setFilterRuleDrafts],
  );

  const removeFilterRuleDraft = useCallback(
    (ruleId) => {
      setFilterRuleDrafts((prev) => prev.filter((rule) => rule.id !== ruleId));
    },
    [setFilterRuleDrafts],
  );

  const applyFilterRuleDrafts = useCallback(() => {
    setPage(1);
    setFilterRules(normalizeFilterRuleDrafts(filterRuleDrafts));
    setIsFilterPanelOpen(false);
  }, [filterRuleDrafts, normalizeFilterRuleDrafts, setFilterRules, setIsFilterPanelOpen, setPage]);

  const toggleFilterPanelFromToolbar = useCallback(
    (event) => {
      event.stopPropagation();
      setIsFilterPanelOpen((prev) => {
        const next = !prev;
        if (next) {
          setFilterRuleDrafts(
            filterRules.length > 0
              ? filterRules.map((rule) => ({ ...rule }))
              : currentColumns.length > 0
                ? [getDefaultRuleForColumn()]
                : [],
          );
        }
        return next;
      });
    },
    [
      currentColumns.length,
      filterRules,
      getDefaultRuleForColumn,
      setFilterRuleDrafts,
      setIsFilterPanelOpen,
    ],
  );

  const getDefaultFilterDraft = useCallback(
    (column) => {
      const activeFilter = serverColumnFilters[column.name];
      const options = getFilterOperatorOptions(column);
      return {
        operator: activeFilter?.operator || options[0]?.value || 'contains',
        value: activeFilter?.value || '',
      };
    },
    [getFilterOperatorOptions, serverColumnFilters],
  );

  const openColumnMenu = useCallback(
    (column) => {
      setColumnMenu((prev) => ({
        columnName: prev.columnName === column.name ? null : column.name,
        draft: prev.columnName === column.name ? null : getDefaultFilterDraft(column),
      }));
    },
    [getDefaultFilterDraft, setColumnMenu],
  );

  const applyColumnFilter = useCallback(
    (columnName) => {
      if (!columnMenu.draft) return;
      const nextValue = String(columnMenu.draft.value || '').trim();
      setPage(1);
      setServerColumnFilters((prev) => {
        if (nextValue === '') {
          const next = { ...prev };
          delete next[columnName];
          return next;
        }
        return {
          ...prev,
          [columnName]: {
            operator: columnMenu.draft.operator,
            value: nextValue,
          },
        };
      });
      setColumnMenu({ columnName: null, draft: null });
    },
    [columnMenu.draft, setColumnMenu, setPage, setServerColumnFilters],
  );

  const clearColumnFilter = useCallback(
    (columnName) => {
      setPage(1);
      setServerColumnFilters((prev) => {
        const next = { ...prev };
        delete next[columnName];
        return next;
      });
      setColumnMenu({ columnName: null, draft: null });
    },
    [setColumnMenu, setPage, setServerColumnFilters],
  );

  const appliedServerFilterEntries = useMemo(
    () =>
      Object.entries(serverColumnFilters || {}).filter(
        ([, filterConfig]) =>
          filterConfig &&
          typeof filterConfig === 'object' &&
          String(filterConfig.value ?? '').trim() !== '',
      ),
    [serverColumnFilters],
  );

  const activeRuleFilters = useMemo(
    () => normalizeFilterRuleDrafts(filterRules),
    [filterRules, normalizeFilterRuleDrafts],
  );

  const activeColumnFilterCount = appliedServerFilterEntries.length + activeRuleFilters.length;

  const clearAllColumnFilters = useCallback(() => {
    setPage(1);
    setServerColumnFilters({});
    setFilterRules([]);
    setFilterRuleDrafts(currentColumns.length > 0 ? [getDefaultRuleForColumn()] : []);
    setColumnMenu({ columnName: null, draft: null });
  }, [
    currentColumns.length,
    getDefaultRuleForColumn,
    setColumnMenu,
    setFilterRuleDrafts,
    setFilterRules,
    setPage,
    setServerColumnFilters,
  ]);

  return {
    isNumericColumn,
    isTemporalColumn,
    getFilterOperatorOptions,
    addFilterRuleDraft,
    updateFilterRuleDraft,
    removeFilterRuleDraft,
    applyFilterRuleDrafts,
    toggleFilterPanelFromToolbar,
    openColumnMenu,
    applyColumnFilter,
    clearColumnFilter,
    appliedServerFilterEntries,
    activeRuleFilters,
    activeColumnFilterCount,
    clearAllColumnFilters,
  };
}
