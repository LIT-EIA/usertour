import { Attribute, ThemeVariation } from '@usertour/types';
import { Button } from '@usertour-packages/button';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { SubThemeModal } from './sub-theme-modal';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import {
  DndContext,
  DragEndEvent,
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
import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

interface ConditionalVariationsPanelProps {
  variations: ThemeVariation[];
  onVariationsChange?: (variations: ThemeVariation[]) => void;
  attributeList?: Attribute[];
}

// Sortable variation item component
const SortableVariationItem = ({
  variation,
  index,
  count,
  onClick,
  onMove,
}: {
  variation: ThemeVariation;
  index: number;
  count: number;
  onClick: () => void;
  onMove: (from: number, to: number) => void;
}) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: index.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const name = variation.name || t('themeBuilder.chrome.variationWithIndex', { index: index + 1 });
  const moveButtonClass =
    'h-6 w-6 p-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100';

  // Drag handle sits beside (not inside) the edit button to avoid nested controls; the move
  // buttons give a single-pointer/keyboard alternative to dragging (WCAG 2.5.7).
  return (
    <div ref={setNodeRef} style={style} className="group w-full flex items-center gap-1">
      <span
        {...attributes}
        {...listeners}
        aria-label={t('themeBuilder.aria.dragToReorder')}
        className="flex-none cursor-move rounded-sm p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <DragHandleDots2Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <Button
        variant="outline"
        className="flex items-center gap-2 grow justify-start h-auto px-1 py-2 border-none hover:text-primary hover:bg-accent/50"
        onClick={onClick}
      >
        <span className="text-sm font-medium">{name}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={moveButtonClass}
        disabled={index === 0}
        aria-label={t('themeBuilder.aria.moveUp', { name })}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={moveButtonClass}
        disabled={index === count - 1}
        aria-label={t('themeBuilder.aria.moveDown', { name })}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};

export const ConditionalVariationsPanel = ({
  variations,
  onVariationsChange,
  attributeList,
}: ConditionalVariationsPanelProps) => {
  const { t } = useTranslation();
  const [openModal, setOpenModal] = useState(false);
  const [editingVariation, setEditingVariation] = useState<ThemeVariation | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddVariation = () => {
    setEditingVariation(null);
    setEditingIndex(-1);
    setOpenModal(true);
  };

  const handleEditVariation = (variation: ThemeVariation, index: number) => {
    setEditingVariation(variation);
    setEditingIndex(index);
    setOpenModal(true);
  };

  const handleSaveVariation = (variation: ThemeVariation) => {
    if (onVariationsChange) {
      const newVariations = [...variations];
      if (editingIndex >= 0) {
        // Edit existing variation
        newVariations[editingIndex] = variation;
      } else {
        // Add new variation
        newVariations.push(variation);
      }
      onVariationsChange(newVariations);
    }
    setOpenModal(false);
    setEditingVariation(null);
    setEditingIndex(-1);
  };

  const handleDeleteVariation = () => {
    if (onVariationsChange && editingIndex >= 0) {
      const newVariations = variations.filter((_, index) => index !== editingIndex);
      onVariationsChange(newVariations);
    }
    setOpenModal(false);
    setEditingVariation(null);
    setEditingIndex(-1);
  };

  const handleMoveVariation = (from: number, to: number) => {
    if (onVariationsChange && to >= 0 && to < variations.length) {
      onVariationsChange(arrayMove(variations, from, to));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = Number.parseInt(active.id as string, 10);
      const newIndex = Number.parseInt(over?.id as string, 10);

      if (onVariationsChange) {
        const newVariations = arrayMove(variations, oldIndex, newIndex);
        onVariationsChange(newVariations);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {t('themeBuilder.chrome.conditionalVariationsLabel')}
          </span>
          <QuestionTooltip>
            {t('themeBuilder.tooltips.variations')
              .split('\n')
              .map((line, index) => (
                <span key={index}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
          </QuestionTooltip>
        </div>

        {variations.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={variations.map((_, index) => index.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {variations.map((variation, index) => (
                  <SortableVariationItem
                    key={variation.id || index}
                    variation={variation}
                    index={index}
                    count={variations.length}
                    onClick={() => handleEditVariation(variation, index)}
                    onMove={handleMoveVariation}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Button
          variant="link"
          size="sm"
          onClick={handleAddVariation}
          className="gap-2 hover:no-underline w-fit p-0"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          {t('themeBuilder.actions.addVariation')}
        </Button>
      </div>

      {openModal && (
        <SubThemeModal
          isOpen={openModal}
          onOpenChange={setOpenModal}
          initialVariation={editingVariation}
          onSave={handleSaveVariation}
          onDelete={handleDeleteVariation}
          attributeList={attributeList}
        />
      )}
    </div>
  );
};
