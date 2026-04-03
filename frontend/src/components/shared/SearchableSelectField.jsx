import { Check, ChevronsUpDown, Search } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function SearchableSelectField({
  value,
  onChange,
  options = [],
  placeholder = '',
  searchPlaceholder = 'Search...',
  emptyLabel = 'No results',
  disabled = false,
  tc,
  className = '',
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(
    () => options.find((entry) => entry.value === value) || null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (normalizedQuery === '') return options;
    return options.filter((entry) =>
      String(entry.label || entry.value || '')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => !prev);
        }}
        className={`w-full px-3 py-2 rounded-lg border bg-[#101013] text-left text-sm transition-colors flex items-center justify-between gap-2 ${
          isOpen ? `${tc.border} ${tc.lightBg}` : 'border-[#333] hover:border-[#4a4a52]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-zinc-200'} ${tc.focusRing}`}
      >
        <span className="truncate">
          {selectedOption?.label || selectedOption?.value || value || placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-zinc-500 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[180] rounded-xl border border-[#34343a] bg-[#17171b] shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-[#2d2d33]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full py-1.5 pl-8 pr-2.5 rounded-md border border-[#333] bg-[#0f0f12] text-xs text-zinc-200 ${tc.focusRing}`}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((entry) => {
                const isActive = entry.value === value;
                return (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => {
                      onChange(entry.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-md text-xs transition-colors flex items-center justify-between gap-2 ${
                      isActive
                        ? `${tc.lightBg} ${tc.textLight}`
                        : 'text-zinc-300 hover:bg-[#232329]'
                    }`}
                  >
                    <span className="truncate text-left">{entry.label}</span>
                    {isActive ? <Check className={`w-3.5 h-3.5 shrink-0 ${tc.textLight}`} /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-3 text-[11px] text-zinc-500 text-center">{emptyLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

