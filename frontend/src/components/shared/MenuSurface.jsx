import React from 'react';
import FloatingPanel from './FloatingPanel.jsx';
import { clampPointToViewport } from './floatingPanelUtils.js';

const BASE_SURFACE_CLASS =
  'bg-[#1c1c1c] border border-[#333] shadow-2xl rounded-lg max-w-[calc(100vw-32px)]';

export default function MenuSurface({
  open,
  anchor = null,
  point = null,
  placement = 'bottom-start',
  offset = 8,
  onClick,
  className = '',
  style,
  children,
}) {
  if (!open) {
    return null;
  }

  if (point) {
    const width = Number(point.width || 220);
    const height = Number(point.height || 260);
    const clamped = clampPointToViewport(Number(point.x || 0), Number(point.y || 0), width, height);
    return (
      <div
        onClick={onClick}
        className={`fixed ${BASE_SURFACE_CLASS} ${className}`}
        style={{ ...clamped, ...style }}
      >
        {children}
      </div>
    );
  }

  return (
    <FloatingPanel
      open={open}
      anchor={anchor}
      placement={placement}
      offset={offset}
      onClick={onClick}
      className={`${BASE_SURFACE_CLASS} ${className}`}
      style={style}
    >
      {children}
    </FloatingPanel>
  );
}
