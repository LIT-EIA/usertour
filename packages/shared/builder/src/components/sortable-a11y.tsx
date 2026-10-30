import { DndContextProps, UniqueIdentifier } from '@dnd-kit/core';
import { ChevronDownIcon, ChevronUpIcon, DragHandleDots2Icon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type SortableMoveDirection = 'up' | 'down';

// Names are user-entered and end up in plain-text attributes or live regions, which React
// already escapes; i18next's HTML escaping would make screen readers read "&amp;".
const raw = { interpolation: { escapeValue: false } };

interface UseSortableListA11yOptions {
  ids: UniqueIdentifier[];
  getName: (id: UniqueIdentifier) => string;
}

/**
 * Localized announcements for pointer drags, a status region for button moves, and focus
 * management that keeps focus on the pressed move button after the list re-renders.
 */
export const useSortableListA11y = ({ ids, getName }: UseSortableListA11yOptions) => {
  const { t } = useTranslation();
  const listId = useId();
  const [status, setStatus] = useState('');
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const total = ids.length;
  const position = (id: UniqueIdentifier) => ids.indexOf(id) + 1;

  const accessibility: DndContextProps['accessibility'] = {
    // The drag handle is not focusable, so dnd-kit would otherwise move focus into the card.
    restoreFocus: false,
    announcements: {
      onDragStart: ({ active }) => {
        lastOverId.current = active.id;
        return t('contentBuilder.sortable.pickedUp', {
          name: getName(active.id),
          position: position(active.id),
          total,
          ...raw,
        });
      },
      // dnd-kit reports the item over itself right after pickup, which would replace the
      // "picked up" message; only announce actual position changes.
      onDragOver: ({ active, over }) => {
        if (!over || over.id === lastOverId.current) {
          return undefined;
        }
        lastOverId.current = over.id;
        return t('contentBuilder.sortable.moved', {
          name: getName(active.id),
          position: position(over.id),
          total,
          ...raw,
        });
      },
      onDragEnd: ({ active, over }) =>
        over
          ? t('contentBuilder.sortable.dropped', {
              name: getName(active.id),
              position: position(over.id),
              total,
              ...raw,
            })
          : t('contentBuilder.sortable.cancelled', {
              name: getName(active.id),
              position: position(active.id),
              ...raw,
            }),
      onDragCancel: ({ active }) =>
        t('contentBuilder.sortable.cancelled', {
          name: getName(active.id),
          position: position(active.id),
          ...raw,
        }),
    },
  };

  const announceMove = (
    from: EventTarget | null,
    id: UniqueIdentifier,
    newIndex: number,
    direction: SortableMoveDirection,
  ) => {
    setStatus(
      t('contentBuilder.sortable.moved', {
        name: getName(id),
        position: newIndex + 1,
        total,
        ...raw,
      }),
    );
    // The list re-renders after a move, so put focus back on the same button of the moved
    // item, even when it is now aria-disabled at the edge of the list.
    const root = (from as Node | null)?.getRootNode?.() as ParentNode | undefined;
    requestAnimationFrame(() => {
      root
        ?.querySelector<HTMLElement>(
          `[data-sortable-list="${listId}"][data-sortable-index="${newIndex}"] [data-sortable-move="${direction}"]`,
        )
        ?.focus();
    });
  };

  // Up/Down step focus through the list in reading order: each card, then the controls
  // inside it, then the next card. Home/End jump to the first/last card. Portaled content
  // such as the delete dialog is skipped: React bubbles its events here, but it is not
  // inside the card in the DOM.
  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const card = event.currentTarget;
    if (!card.contains(event.target as Node)) {
      return;
    }
    const cardSelector = `[data-sortable-list="${listId}"]`;
    const root = card.getRootNode() as ParentNode;
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const stops = [
        ...root.querySelectorAll<HTMLElement>(`${cardSelector}, ${cardSelector} button`),
      ];
      const current = stops.indexOf(event.target as HTMLElement);
      next = stops[current + (event.key === 'ArrowUp' ? -1 : 1)];
    } else if (event.key === 'Home' || event.key === 'End') {
      const cards = [...root.querySelectorAll<HTMLElement>(cardSelector)];
      next = event.key === 'Home' ? cards[0] : cards[cards.length - 1];
    } else {
      return;
    }
    event.preventDefault();
    next?.focus();
  };

  // The group name carries the position and list size, since the cards are not list items.
  const itemProps = (index: number) => ({
    tabIndex: 0,
    onKeyDown: handleItemKeyDown,
    'aria-label': t('contentBuilder.sortable.itemLabel', {
      name: getName(ids[index]),
      position: index + 1,
      total,
      ...raw,
    }),
    'data-sortable-list': listId,
    'data-sortable-index': index,
  });

  const statusRegion = (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {status}
    </div>
  );

  return { accessibility, announceMove, itemProps, statusRegion };
};

interface SortableHandleProps {
  listeners?: Record<string, any>;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
}

// Pointer-only drag grip; keyboard and screen reader users reorder with SortableMoveButtons.
export const SortableHandle = ({ listeners = {}, setActivatorNodeRef }: SortableHandleProps) => (
  <span
    ref={setActivatorNodeRef}
    aria-hidden="true"
    className="inline-flex flex-none items-center justify-center h-6 w-6 rounded-md cursor-grab hover:bg-accent"
    {...listeners}
  >
    <DragHandleDots2Icon />
  </span>
);

interface SortableMoveButtonsProps {
  index: number;
  total: number;
  onMove: (direction: SortableMoveDirection, target: EventTarget) => void;
}

// Single-pointer and keyboard alternative to dragging (WCAG 2.5.7, 2.1.1). At the ends of the
// list the buttons use aria-disabled rather than disabled, so they keep focus after a move.
export const SortableMoveButtons = ({ index, total, onMove }: SortableMoveButtonsProps) => {
  const { t } = useTranslation();
  const buttons = [
    { direction: 'up' as const, label: t('contentBuilder.sortable.moveUp'), Icon: ChevronUpIcon },
    {
      direction: 'down' as const,
      label: t('contentBuilder.sortable.moveDown'),
      Icon: ChevronDownIcon,
    },
  ];

  return (
    <>
      {buttons.map(({ direction, label, Icon }) => {
        const unavailable = direction === 'up' ? index === 0 : index === total - 1;
        return (
          <TooltipProvider key={direction}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-fit aria-disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent"
                  data-sortable-move={direction}
                  aria-disabled={unavailable}
                  onClick={(e) => !unavailable && onMove(direction, e.currentTarget)}
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </>
  );
};

// The drag preview is purely visual; keep its copies of the controls out of the
// accessibility tree and the tab order.
export const SortableOverlayContent = ({ children }: { children: React.ReactNode }) => (
  <div
    aria-hidden="true"
    ref={(el) => el?.setAttribute('inert', '')}
    className="rounded-lg shadow-lg ring-2 ring-ring cursor-grabbing"
  >
    {children}
  </div>
);
