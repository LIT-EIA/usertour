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
import { ExclamationTriangleIcon, GearIcon } from '@radix-ui/react-icons';
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
import {
  Delete2Icon,
  EventIcon2,
  EyeNoneIcon,
  ModelIcon,
  TooltipIcon,
} from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { Step } from '@usertour/types';
import { forwardRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { defaultStep } from '@usertour/helpers';
import {
  SortableHandle,
  SortableMoveButtons,
  SortableMoveDirection,
  SortableOverlayContent,
  useSortableListA11y,
} from '../../components/sortable-a11y';
import { BuilderMode, useBuilderContext } from '../../contexts';
import { stepIsReachable } from '../../utils/content-validate';

const SidebarContent = forwardRef<HTMLDivElement, any>(
  (
    {
      index,
      step,
      total,
      onClick,
      onMove,
      listeners = {},
      setActivatorNodeRef,
      isReachable = true,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const handleEdit = () => {
      onClick('edit', index);
    };
    const handleEditTrigger = () => {
      onClick('trigger', index);
    };
    const handleDelete = () => {
      onClick('delete', index);
    };

    return (
      <div
        key={index}
        ref={ref}
        // biome-ignore lint/a11y/useSemanticElements: a sortable card, not a set of form fields, so <fieldset> does not fit
        role="group"
        {...props}
        className="bg-background-700 p-2.5 rounded-lg py-3.5 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between ">
          <div className="grow min-w-0 inline-flex items-center text-sm ">
            <SortableHandle listeners={listeners} setActivatorNodeRef={setActivatorNodeRef} />
            {step.type === 'tooltip' && (
              <TooltipIcon className="w-4 h-4 mt-0.5 mx-0.5" aria-hidden="true" />
            )}
            {step.type === 'modal' && (
              <ModelIcon className="w-4 h-4 mt-0.5 mx-0.5" aria-hidden="true" />
            )}
            {step.type === 'hidden' && (
              <EyeNoneIcon className="w-4 h-4 mx-0.5" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {index + 1}. {step.name}
            </span>
          </div>
          <div className="flex-none">
            {onMove && <SortableMoveButtons index={index} total={total} onMove={onMove} />}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-fit"
                    onClick={handleEdit}
                    aria-label={t('contentBuilder.flow.edit')}
                  >
                    <GearIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('contentBuilder.flow.edit')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-fit"
                    onClick={handleEditTrigger}
                    aria-label={t('contentBuilder.flow.trigger')}
                  >
                    <EventIcon2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('contentBuilder.flow.trigger')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AlertDialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-fit"
                        aria-label={t('contentBuilder.flow.delete')}
                      >
                        <Delete2Icon
                          className="h-4 w-4 text-foreground"
                          // onClick={handleDelete}
                          aria-hidden="true"
                        />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('contentBuilder.flow.delete')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('contentBuilder.flow.deleteConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('contentBuilder.flow.deleteConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('contentBuilder.common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} variant={'destructive'}>
                    {t('contentBuilder.flow.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {!isReachable && (
          <div className="flex items-stretch items-center text-warning space-x-1">
            <div className="flex-none self-start pt-1">
              <ExclamationTriangleIcon className="h-3 w-3" aria-hidden="true" />
            </div>
            <span className="text-xs grow ">{t('contentBuilder.flow.stepNotReachable')}</span>
          </div>
        )}
      </div>
    );
  },
);

const SortableItem = ({ id, step, total, onClick, onMove, isReachable, ...props }: any) => {
  const { listeners, isDragging, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <SidebarContent
      ref={setNodeRef}
      style={style}
      isReachable={isReachable}
      index={id}
      total={total}
      onClick={onClick}
      onMove={onMove}
      step={step}
      listeners={listeners}
      setActivatorNodeRef={setActivatorNodeRef}
      {...props}
    />
  );
};

export const SidebarContents = () => {
  const {
    setSelectorOutput,
    setCurrentIndex,
    setCurrentMode,
    currentVersion,
    setCurrentVersion,
    setCurrentStep,
  } = useBuilderContext();
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const steps = currentVersion?.steps ?? [];
  const { accessibility, announceMove, itemProps, statusRegion } = useSortableListA11y({
    ids: steps.map((_, index) => index),
    getName: (id) => steps[id as number]?.name ?? '',
  });

  const moveStep = (from: number, to: number) => {
    setCurrentVersion((pre) => {
      if (pre?.steps) {
        return { ...pre, steps: arrayMove(pre.steps, from, to) };
      }
    });
  };

  const handleMove = (index: number, direction: SortableMoveDirection, target: EventTarget) => {
    const to = direction === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= steps.length) {
      return;
    }
    moveStep(index, to);
    announceMove(target, index, to, direction);
  };

  const handleDeleteStep = (_: Step, index: number) => {
    setCurrentVersion((pre) => {
      if (pre?.steps) {
        const copySteps = [...pre.steps];
        copySteps.splice(index, 1);
        return { ...pre, steps: copySteps };
      }
    });
  };

  const handleEditStep = (step: Step, index: number, mode: BuilderMode) => {
    setSelectorOutput(null);
    const _step = JSON.parse(
      JSON.stringify({
        ...step,
        setting: { ...defaultStep.setting, ...step.setting },
      }),
    );
    setCurrentStep(_step);
    setCurrentIndex(index);
    setCurrentMode({ mode });
  };

  const handleOnClick = useCallback(
    (action: string, index: number) => {
      if (!currentVersion?.steps) {
        return;
      }
      const _step = currentVersion.steps[index];
      if (action === 'delete') {
        handleDeleteStep(_step, index);
      } else {
        const mode: BuilderMode =
          action === 'trigger' ? BuilderMode.FLOW_STEP_TRIGGER : BuilderMode.FLOW_STEP_DETAIL;
        handleEditStep(_step, index, mode);
      }
    },
    [currentVersion],
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveId(null);
      if (currentVersion?.steps && over && active.id !== over.id) {
        moveStep(active.id as number, over.id as number);
      }
    },
    [currentVersion],
  );

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (!currentVersion?.steps) {
    return <></>;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={accessibility}
      >
        <SortableContext
          items={currentVersion?.steps.map((step, index) => {
            return { ...step, id: index };
          })}
          strategy={verticalListSortingStrategy}
        >
          {currentVersion.steps.map((step, index) => (
            <SortableItem
              key={index}
              id={index}
              isReachable={stepIsReachable(currentVersion.steps as Step[], step)}
              step={step}
              total={steps.length}
              onClick={handleOnClick}
              onMove={(direction: SortableMoveDirection, target: EventTarget) =>
                handleMove(index, direction, target)
              }
              {...itemProps(index)}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeId !== null ? (
            <SortableOverlayContent>
              <SidebarContent
                index={activeId}
                total={steps.length}
                isReachable={stepIsReachable(currentVersion.steps, currentVersion.steps[activeId])}
                step={currentVersion.steps[activeId]}
              />
            </SortableOverlayContent>
          ) : null}
        </DragOverlay>
      </DndContext>
      {statusRegion}
    </>
  );
};
SidebarContents.displayName = 'SidebarContents';
