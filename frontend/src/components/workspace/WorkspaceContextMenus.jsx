import React from 'react';
import {
  AlertCircle,
  Code,
  Columns,
  Copy,
  CopyPlus,
  Rows,
  Star,
  ToggleLeft,
  Trash2,
} from 'lucide-react';
import MenuSurface from '../shared/MenuSurface.jsx';

export default function WorkspaceContextMenus({
  t,
  contextMenu,
  cellContextMenu,
  selectDbAndTable,
  togglePinTable,
  isTablePinned,
  handleDuplicateTable,
  handleTruncateTable,
  handleDeleteTable,
  copyToClipboard,
  getCellTextValue,
  closeCellContextMenu,
  openCellJsonViewerFromMenu,
  setCellNullFromMenu,
  currentTableData,
}) {
  return (
    <>
      {contextMenu.visible && (
        <MenuSurface
          open={contextMenu.visible}
          point={{ x: contextMenu.x, y: contextMenu.y, width: 220, height: 260 }}
          className="py-1 z-[100] min-w-[160px]"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-[#2e2e32] mb-1">
            {contextMenu.tableName}
          </div>
          <button
            onClick={() => selectDbAndTable(contextMenu.dbName, contextMenu.tableName, 'gozat')}
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#2e2e32] hover:text-white flex items-center gap-2"
          >
            <Rows className="w-3.5 h-3.5" /> {t('openTable')}
          </button>
          <button
            onClick={() => selectDbAndTable(contextMenu.dbName, contextMenu.tableName, 'yapi')}
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#2e2e32] hover:text-white flex items-center gap-2"
          >
            <Columns className="w-3.5 h-3.5" /> {t('viewSchema')}
          </button>

          <div className="my-1 border-t border-[#2e2e32]"></div>
          <button
            onClick={() => togglePinTable(contextMenu.dbName, contextMenu.tableName)}
            className="w-full text-left px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-400/10 flex items-center gap-2"
          >
            <Star className="w-3.5 h-3.5" />{' '}
            {isTablePinned(contextMenu.dbName, contextMenu.tableName)
              ? t('removeFromFav')
              : t('addToFav')}
          </button>
          <button
            onClick={() => handleDuplicateTable(contextMenu.dbName, contextMenu.tableName)}
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#2e2e32] hover:text-white flex items-center gap-2"
          >
            <CopyPlus className="w-3.5 h-3.5" /> {t('duplicateTable')}
          </button>

          <div className="my-1 border-t border-[#2e2e32]"></div>
          <button
            onClick={() => handleTruncateTable(contextMenu.dbName, contextMenu.tableName)}
            className="w-full text-left px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-400/10 flex items-center gap-2"
          >
            <AlertCircle className="w-3.5 h-3.5" /> {t('truncate')}
          </button>
          <button
            onClick={(e) => handleDeleteTable(e, contextMenu.dbName, contextMenu.tableName)}
            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> {t('drop')}
          </button>
        </MenuSurface>
      )}

      {cellContextMenu.visible && (
        <MenuSurface
          open={cellContextMenu.visible}
          point={{ x: cellContextMenu.x, y: cellContextMenu.y, width: 220, height: 220 }}
          className="py-1 z-[130] min-w-[180px]"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-[#2e2e32] mb-1">
            {cellContextMenu.colName}
          </div>
          <button
            onClick={() => {
              copyToClipboard(getCellTextValue(cellContextMenu.value));
              closeCellContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#2e2e32] hover:text-white flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" /> {t('copy')}
          </button>
          {cellContextMenu.canShowJson && (
            <button
              onClick={openCellJsonViewerFromMenu}
              className="w-full text-left px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-400/10 flex items-center gap-2"
            >
              <Code className="w-3.5 h-3.5" /> {t('viewJson')}
            </button>
          )}
          <div className="my-1 border-t border-[#2e2e32]" />
          <button
            onClick={setCellNullFromMenu}
            disabled={currentTableData?.type === 'view'}
            className="w-full text-left px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-400/10 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ToggleLeft className="w-3.5 h-3.5" /> {t('setNull')}
          </button>
        </MenuSurface>
      )}
    </>
  );
}
