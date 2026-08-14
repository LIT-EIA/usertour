import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleDots2Icon, GearIcon } from '@radix-ui/react-icons';
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
import { BuilderMode, useBuilderContext, useChecklistContext } from '../../../contexts';
// Add interface for component props
interface ChecklistContentProps {
  onClick?: (action: 'edit' | 'delete', item: ChecklistItemType) => void;
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
  item: ChecklistItemType;
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
  ({ onClick, listeners = {}, attributes = {}, item, style }, ref) => {
    const { t } = useTranslation();
    return (
      <div
        ref={ref}
        {...attributes}
        style={style}
        className="bg-background-700 p-2.5 rounded-lg flex flex-col"
      >
        <div className="flex items-center justify-between">
          <div className="grow inline-flex items-center text-sm gap-2">
            <DragHandleDots2Icon className="cursor-move" {...listeners} />
            <span className="w-36 truncate" title={item.name}>
              {item.name}
            </span>
          </div>

          <div className="flex-none flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-fit"
                    onClick={() => onClick?.('edit', item)}
                  >
                    <GearIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('contentBuilder.checklist.edit')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DeleteDialog onDelete={() => onClick?.('delete', item)}>
              <Button variant="ghost" size="sm" className="p-1 h-fit">
                <Delete2Icon className="h-4 w-4 text-foreground" />
              </Button>
            </DeleteDialog>
          </div>
        </div>
      </div>
    );
  },
);

const SortableItem = ({ id, onClick, item }: any) => {
  const { attributes, listeners, isDragging, setNodeRef, transform, transition } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <ChecklistContent
      ref={setNodeRef}
      item={item}
      style={style}
      onClick={onClick}
      listeners={listeners}
      attributes={attributes}
    />
  );
};

export const ChecklistContents = () => {
  const { setCurrentMode } = useBuilderContext();
  const { localData, updateLocalData, setCurrentItem, removeItem } = useChecklistContext();
  const { t } = useTranslation();

  if (!localData) {
    return null;
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
    if (active && over && active.id !== over?.id) {
      const from = localData.items.findIndex((item) => item.id === active.id);
      const to = localData.items.findIndex((item) => item.id === over.id);
      const newList = arrayMove(localData.items, from, to);
      updateLocalData({ items: newList });
      setActiveId(null);
    }
  };

  const activeItem = localData.items.find((item) => item.id === activeId);

  return (
    <>
      <div className="flex justify-between items-center space-x-1	">
        <h1 className="text-sm">{t('contentBuilder.checklist.items')}</h1>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={localData.items} strategy={verticalListSortingStrategy}>
          {localData.items.map((item) => (
            <SortableItem id={item.id} onClick={handleOnClick} key={item.id} item={item} />
          ))}
        </SortableContext>
        <DragOverlay>{activeItem ? <ChecklistContent item={activeItem} /> : null}</DragOverlay>
      </DndContext>
    </>
  );
};

ChecklistContents.displayName = 'ChecklistContents';
