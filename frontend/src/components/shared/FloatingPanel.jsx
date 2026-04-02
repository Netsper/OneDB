import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const VIEWPORT_PADDING = 16;
const HIDDEN_STYLE = {
  position: 'fixed',
  top: -9999,
  left: -9999,
  visibility: 'hidden',
};

function resolveAnchorElement(anchor) {
  if (!anchor) return null;
  if (typeof anchor === 'object' && 'current' in anchor) {
    return anchor.current;
  }
  return anchor;
}

function getPlacementParts(placement) {
  const [side = 'bottom', align = 'start'] = String(placement || 'bottom-start').split('-');
  return { side, align };
}

function getAlignedLeft(anchorRect, panelWidth, align) {
  if (align === 'end') {
    return anchorRect.right - panelWidth;
  }
  if (align === 'center') {
    return anchorRect.left + (anchorRect.width - panelWidth) / 2;
  }
  return anchorRect.left;
}

function resolveBestHorizontalAlignment(anchorRect, panelWidth, preferredAlign) {
  const alignCandidates =
    preferredAlign === 'center'
      ? ['center', 'start', 'end']
      : [preferredAlign, preferredAlign === 'start' ? 'end' : 'start', 'center'];
  const viewportLeft = VIEWPORT_PADDING;
  const viewportRight = window.innerWidth - VIEWPORT_PADDING;

  let bestCandidate = null;

  alignCandidates.forEach((align, index) => {
    const rawLeft = getAlignedLeft(anchorRect, panelWidth, align);
    const overflowLeft = Math.max(0, viewportLeft - rawLeft);
    const overflowRight = Math.max(0, rawLeft + panelWidth - viewportRight);
    const overflowPenalty = overflowLeft + overflowRight;

    if (
      bestCandidate === null ||
      overflowPenalty < bestCandidate.overflowPenalty ||
      (overflowPenalty === bestCandidate.overflowPenalty && index < bestCandidate.index)
    ) {
      bestCandidate = { rawLeft, overflowPenalty, index };
    }
  });

  return bestCandidate?.rawLeft ?? getAlignedLeft(anchorRect, panelWidth, preferredAlign);
}

function computeFloatingStyle({ anchorRect, panelRect, placement, offset, matchAnchorWidth }) {
  const { side: preferredSide, align } = getPlacementParts(placement);
  const panelWidth = matchAnchorWidth ? anchorRect.width : panelRect.width;
  const panelHeight = panelRect.height;
  const availableAbove = Math.max(0, anchorRect.top - VIEWPORT_PADDING - offset);
  const availableBelow = Math.max(
    0,
    window.innerHeight - anchorRect.bottom - VIEWPORT_PADDING - offset,
  );

  let side = preferredSide;
  if (
    preferredSide === 'bottom' &&
    panelHeight > availableBelow &&
    availableAbove > availableBelow
  ) {
    side = 'top';
  } else if (
    preferredSide === 'top' &&
    panelHeight > availableAbove &&
    availableBelow > availableAbove
  ) {
    side = 'bottom';
  }

  let left = resolveBestHorizontalAlignment(anchorRect, panelWidth, align);

  left = Math.min(
    window.innerWidth - panelWidth - VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, left),
  );

  let top = side === 'top' ? anchorRect.top - panelHeight - offset : anchorRect.bottom + offset;

  const maxHeight = Math.max(140, side === 'top' ? availableAbove : availableBelow);

  if (side === 'top' && top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING;
  }

  if (side === 'bottom' && top + panelHeight > window.innerHeight - VIEWPORT_PADDING) {
    top = Math.max(VIEWPORT_PADDING, window.innerHeight - panelHeight - VIEWPORT_PADDING);
  }

  return {
    position: 'fixed',
    top,
    left,
    maxHeight,
    width: matchAnchorWidth ? anchorRect.width : undefined,
    visibility: 'visible',
  };
}

export default function FloatingPanel({
  open,
  anchor,
  placement = 'bottom-start',
  offset = 8,
  matchAnchorWidth = false,
  className = '',
  style,
  children,
  onClick,
}) {
  const panelRef = useRef(null);
  const [floatingStyle, setFloatingStyle] = useState(HIDDEN_STYLE);

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') {
      setFloatingStyle(HIDDEN_STYLE);
      return undefined;
    }

    const updatePosition = () => {
      const anchorElement = resolveAnchorElement(anchor);
      const panelElement = panelRef.current;
      if (!anchorElement || !panelElement) {
        setFloatingStyle(HIDDEN_STYLE);
        return;
      }

      setFloatingStyle(
        computeFloatingStyle({
          anchorRect: anchorElement.getBoundingClientRect(),
          panelRect: panelElement.getBoundingClientRect(),
          placement,
          offset,
          matchAnchorWidth,
        }),
      );
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchor, matchAnchorWidth, offset, open, placement]);

  useEffect(() => {
    if (!open) {
      setFloatingStyle(HIDDEN_STYLE);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      onClick={onClick}
      className={`fixed ${className}`}
      style={{ ...floatingStyle, ...style }}
    >
      {children}
    </div>
  );
}
