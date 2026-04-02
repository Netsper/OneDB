import React, { useRef, useState } from 'react';
import FloatingPanel from './FloatingPanel.jsx';

export default function HoverTooltip({
  content,
  children,
  placement = 'bottom-start',
  className = '',
}) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const text = String(content || '');

  if (text === '') {
    return <span className={`inline-block w-full ${className}`}>{children}</span>;
  }

  return (
    <span
      ref={anchorRef}
      className={`inline-block w-full ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <FloatingPanel
        open={open}
        anchor={anchorRef}
        placement={placement}
        offset={6}
        className="pointer-events-none bg-[#2e2e32] border border-[#444] p-2.5 rounded-lg shadow-2xl z-[160] text-xs text-zinc-200 whitespace-pre-wrap break-words w-[min(400px,calc(100vw-32px))]"
      >
        {text}
      </FloatingPanel>
    </span>
  );
}
