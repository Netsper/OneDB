import { useEffect } from 'react';

export default function useWorkspaceUiInteractions({
  searchInputRef,
  isCommandOpen,
  setIsCommandOpen,
  contextMenu,
  setContextMenu,
  cellContextMenu,
  setCellContextMenu,
  editingCell,
  setEditingCell,
  modalConfig,
  setModalConfig,
  columnMenu,
  setColumnMenu,
  isVisibilityMenuOpen,
  setIsVisibilityMenuOpen,
  isFilterPanelOpen,
  setIsFilterPanelOpen,
  isColsPanelOpen,
  setIsColsPanelOpen,
  isAutoRefreshMenuOpen,
  setIsAutoRefreshMenuOpen,
  setSidebarWidth,
  sqlContainerRef,
  setSqlEditorHeight,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isCommandOpen) setIsCommandOpen(false);
        else if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false }));
        else if (cellContextMenu.visible)
          setCellContextMenu((prev) => ({ ...prev, visible: false }));
        else if (editingCell) setEditingCell(null);
        else if (modalConfig.isOpen) setModalConfig({ isOpen: false, type: null });
        else if (columnMenu.columnName) setColumnMenu({ columnName: null, draft: null });
        else if (isVisibilityMenuOpen) setIsVisibilityMenuOpen(false);
        else if (isFilterPanelOpen) setIsFilterPanelOpen(false);
        else if (isColsPanelOpen) setIsColsPanelOpen(false);
        else if (isAutoRefreshMenuOpen) setIsAutoRefreshMenuOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => {
          if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
          return !prev;
        });
      }
    };

    const handleClick = () => {
      if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false }));
      if (cellContextMenu.visible) setCellContextMenu((prev) => ({ ...prev, visible: false }));
      if (isAutoRefreshMenuOpen) setIsAutoRefreshMenuOpen(false);
      if (isFilterPanelOpen) setIsFilterPanelOpen(false);
      if (isColsPanelOpen) setIsColsPanelOpen(false);
      if (columnMenu.columnName) setColumnMenu({ columnName: null, draft: null });
      if (isVisibilityMenuOpen) setIsVisibilityMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [
    cellContextMenu.visible,
    columnMenu.columnName,
    contextMenu.visible,
    editingCell,
    isAutoRefreshMenuOpen,
    isColsPanelOpen,
    isCommandOpen,
    isFilterPanelOpen,
    isVisibilityMenuOpen,
    modalConfig.isOpen,
    searchInputRef,
    setCellContextMenu,
    setColumnMenu,
    setContextMenu,
    setEditingCell,
    setIsAutoRefreshMenuOpen,
    setIsColsPanelOpen,
    setIsCommandOpen,
    setIsFilterPanelOpen,
    setIsVisibilityMenuOpen,
    setModalConfig,
  ]);

  const handleSidebarResizeStart = (e) => {
    e.preventDefault();

    const handleSidebarResizeMove = (moveEvent) => {
      let newWidth = moveEvent.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    };

    const handleSidebarResizeUp = () => {
      document.removeEventListener('mousemove', handleSidebarResizeMove);
      document.removeEventListener('mouseup', handleSidebarResizeUp);
    };

    document.addEventListener('mousemove', handleSidebarResizeMove);
    document.addEventListener('mouseup', handleSidebarResizeUp);
  };

  const handleSplitterMouseDown = (e) => {
    e.preventDefault();

    const handleSplitterMouseMove = (moveEvent) => {
      if (sqlContainerRef.current) {
        const containerRect = sqlContainerRef.current.getBoundingClientRect();
        let newHeight = ((moveEvent.clientY - containerRect.top) / containerRect.height) * 100;
        if (newHeight < 20) newHeight = 20;
        if (newHeight > 80) newHeight = 80;
        setSqlEditorHeight(newHeight);
      }
    };

    const handleSplitterMouseUp = () => {
      document.removeEventListener('mousemove', handleSplitterMouseMove);
      document.removeEventListener('mouseup', handleSplitterMouseUp);
    };

    document.addEventListener('mousemove', handleSplitterMouseMove);
    document.addEventListener('mouseup', handleSplitterMouseUp);
  };

  return {
    handleSidebarResizeStart,
    handleSplitterMouseDown,
  };
}
