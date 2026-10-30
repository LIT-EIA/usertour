import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GearIcon } from '@radix-ui/react-icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@usertour-packages/alert-dialog';
import { Button } from '@usertour-packages/button';
import { Delete2Icon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { ChecklistItemType } from '@usertour/types';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SortableHandle,
  SortableMoveButtons,
  SortableMoveDirection,
  SortableOverlayContent,
  useSortableListA11y,
} from '../../../components/sortable-a11y';
import { BuilderMode, useBuilderContext, useChecklistContext } from '../../../contexts';
// Add interface for component props
interface ChecklistContentProps {
  onClick?: (action: 'edit' | 'delete', item: ChecklistItemType) => void;
  onMove?: (direction: SortableMoveDirection, target: EventTarget) => void;
  listeners?: Record<string, any>;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
  item: ChecklistItemType;
  index: number;
  total: number;
  style?: React.CSSProperties;
}

// Extract DeleteDialog as a separate component
const DeleteDialog = ({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: React.ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('contentBuilder.checklist.delete')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('contentBuilder.checklist.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('contentBuilder.checklist.deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('contentBuilder.common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} variant={'destructive'}>
            {t('contentBuilder.checklist.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Optimized ChecklistContent component
const ChecklistContent = forwardRef<HTMLDivElement, ChecklistContentProps>(
  (
    { onClick, onMove, listeners = {}, setActivatorNodeRef, item, index, total, style, ...props },
    ref,
  ) => {
    const { t } = useTranslation();
    return (
      <div
        ref={ref}
        // biome-ignore lint/a11y/useSemanticElements: a sortable card, not a set of form fields, so <fieldset> does not fit
        role="group"
        {...props}
        style={style}
        className="bg-background-700 p-2.5 rounded-lg flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between">
          <div className="grow min-w-0 inline-flex items-center text-sm gap-2">
            <SortableHandle listeners={listeners} setActivatorNodeRef={setActivatorNodeRef} />
            <span className="min-w-0 flex-1 truncate" title={item.name}>
              {item.name}
            </span>
          </div>

          <div className="flex-none flex gap-1">
            {onMove && <SortableMoveButtons index={index} total={total} onMove={onMove} />}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-fit"
                    onClick={() => onClick?.('edit', item)}
                    aria-label={t('contentBuilder.checklist.edit')}
                  >
                    <GearIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('contentBuilder.checklist.edit')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DeleteDialog onDelete={() => onClick?.('delete', item)}>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-fit"
                aria-label={t('contentBuilder.checklist.delete')}
              >
                <Delete2Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
              </Button>
            </DeleteDialog>
          </div>
        </div>
      </div>
    );
  },
);

const SortableItem = ({ id, onClick, onMove, item, index, total, ...props }: any) => {
  const { listeners, isDragging, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <ChecklistContent
      ref={setNodeRef}
      item={item}
      index={index}
      total={total}
      style={style}
      onClick={onClick}
      onMove={onMove}
      listeners={listeners}
      setActivatorNodeRef={setActivatorNodeRef}
      {...props}
    />
  );
};

export const ChecklistContents = () => {
  const { setCurrentMode } = useBuilderContext();
  const { localData, updateLocalData, setCurrentItem, removeItem } = useChecklistContext();
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const items = localData?.items ?? [];
  const { accessibility, announceMove, itemProps, statusRegion } = useSortableListA11y({
    ids: items.map((item) => item.id),
    getName: (id) => items.find((item) => item.id === id)?.name ?? '',
  });

  if (!localData) {
    return null;
  }

  const indexOf = (id: unknown) => localData.items.findIndex((item) => item.id === id);

  const handleMove = (index: number, direction: SortableMoveDirection, target: EventTarget) => {
    const to = direction === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= localData.items.length) {
      return;
    }
    updateLocalData({ items: arrayMove(localData.items, index, to) });
    announceMove(target, localData.items[index].id, to, direction);
  };

  const handleEditItem = (item: ChecklistItemType) => {
    setCurrentItem(item);
    setCurrentMode({ mode: BuilderMode.CHECKLIST_ITEM });
  };

  const handleOnClick = (action: 'edit' | 'delete', item: ChecklistItemType) => {
    if (action === 'edit') {
      handleEditItem(item);
    } else if (action === 'delete') {
      removeItem(item.id);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (over && active.id !== over.id) {
      updateLocalData({
        items: arrayMove(localData.items, indexOf(active.id), indexOf(over.id)),
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeItem = localData.items.find((item) => item.id === activeId);

  return (
    <>
      <div className="flex justify-between items-center space-x-1	">
        <h2 className="text-sm">{t('contentBuilder.checklist.items')}</h2>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={accessibility}
      >
        <SortableContext items={localData.items} strategy={verticalListSortingStrategy}>
          {localData.items.map((item, index) => (
            <SortableItem
              id={item.id}
              onClick={handleOnClick}
              onMove={(direction: SortableMoveDirection, target: EventTarget) =>
                handleMove(index, direction, target)
              }
              key={item.id}
              item={item}
              index={index}
              total={localData.items.length}
              {...itemProps(index)}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeItem ? (
            <SortableOverlayContent>
              <ChecklistContent
                item={activeItem}
                index={indexOf(activeItem.id)}
                total={localData.items.length}
              />
            </SortableOverlayContent>
          ) : null}
        </DragOverlay>
      </DndContext>
      {statusRegion}
    </>
  );
};

ChecklistContents.displayName = 'ChecklistContents';
