import { GearIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-packages/button';
import { cn } from '@usertour-packages/button/src/utils';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvent } from 'react-use';
import { Editor, Element as SlateElement, Node, Path, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useSlateStatic } from 'slate-react';
import { updateNodeStatus } from '../../lib/editorHelper';
import { ColumnElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';

type ColumnElementSerializeType = {
  children: React.ReactNode;
  element: ColumnElementType;
};
export const ColumnElementSerialize = (props: ColumnElementSerializeType) => {
  const { element, children } = props;
  const style = transformsStyle(element);
  return <div style={{ ...style }}>{children}</div>;
};

const transformsStyle = (element: ColumnElementType) => {
  const _style: CSSProperties = {
    display: 'flex',
    position: 'relative',
    flexDirection: 'column',
    marginBottom: '0px',
    justifyContent: element.style?.justifyContent,
    marginRight: `${element.style?.marginRight}px`,
    width: 'auto',
    flex: 'auto',
  };
  if (element.width?.type === 'percent') {
    _style.width = `${element.width?.value}%`;
  } else if (element.width?.type === 'pixels') {
    _style.width = `${element.width?.value}px`;
  } else {
    _style.flex = '1 0 0px';
  }
  // if (showToolbar) {
  //   _style.borderRadius = "2px";
  //   _style.outline = "1px dashed rgba(15, 23, 42,.15)";
  // }
  return _style;
};

export const ColumnElement = (props: RenderElementProps & { className?: string }) => {
  const { t } = useTranslation();
  const { zIndex, showToolbar } = usePopperEditorContext();
  const element = props.element as ColumnElementType;
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const onMousedown = useCallback(
    (event: MouseEvent) => {
      if (!isOpen && ref.current && !ref.current.contains(event.target as any)) {
        setIsActive(false);
      }
    },
    [isOpen, ref],
  ) as EventListenerOrEventListenerObject;
  useEvent('mousedown', onMousedown, window, { capture: false });
  // const editor = useSlate();
  const editor = useSlateStatic();
  const handleDelete = () => {
    const path = ReactEditor.findPath(editor, element);
    const parentPath = Path.parent(path);
    const parent = Node.get(editor, parentPath);
    const isLastChild = SlateElement.isElement(parent) && parent.children.length === 1;

    if (isLastChild) {
      Transforms.removeNodes(editor, {
        at: parentPath,
        // match:
        voids: true,
        match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'group',
      });
    } else {
      Transforms.removeNodes(editor, {
        at: path,
        voids: true,
        match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'column',
      });
      // const nextNodePath = [0];
      // if (Node.has(editor, nextNodePath)) {
      //   Transforms.select(editor, Editor.start(editor, nextNodePath));
      // } else {
      //   Transforms.deselect(editor);
      // }
    }
    updateNodeStatus(editor);
  };
  const handleAddLeftColumn = () => {
    const path = ReactEditor.findPath(editor, element);
    // const insertPath = Path.parent(path);
    Transforms.insertNodes(
      editor,
      {
        type: 'column',
        style: element.style,
        children: [
          {
            type: 'paragraph',
            children: [{ text: '' }],
          },
        ],
      },
      {
        at: path,
      },
    );
  };
  const handleAddRightColumn = () => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.insertNodes(
      editor,
      {
        type: 'column',
        style: element.style,
        children: [
          {
            type: 'paragraph',
            children: [{ text: '' }],
          },
        ],
      },
      {
        at: Path.next(path),
      },
    );
  };

  const handleDistributeValueChange = (justifyContent: string) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      {
        style: { ...element.style, justifyContent },
      },
      { at: path },
    );
  };

  const handleSpaceValueChange = (e: any) => {
    const path = ReactEditor.findPath(editor, element);
    const marginRight = e.target.value;
    Transforms.setNodes(
      editor,
      {
        style: { ...element.style, marginRight },
      },
      { at: path },
    );
  };

  const handleWidthTypeChange = (type: string) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      {
        width: { ...element.width, type },
      },
      { at: path },
    );
  };

  const handleWidthValueChange = (e: any) => {
    const path = ReactEditor.findPath(editor, element);
    const value = e.target.value;
    Transforms.setNodes(
      editor,
      {
        width: { ...element.width, value },
      },
      { at: path },
    );
  };

  useEffect(() => {
    setStyle(transformsStyle(element));
  }, [element.style.justifyContent, element.style.marginRight, element.width, showToolbar]);

  const handleOnClick = () => {
    setIsActive(true);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <div
        {...props.attributes}
        style={{ ...style }}
        className={cn(
          'relative',
          isActive ? 'outline' : isHover ? 'outline-dashed ' : 'outline-none',
          isActive || isHover ? 'outline-1 outline-primary' : '',
        )}
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
        onFocus={() => setIsHover(true)}
        onBlur={() => setIsHover(false)}
        onClick={handleOnClick}
      >
        <Popover.Anchor asChild>
          <Popover.Trigger asChild>
            <Button
              ref={ref}
              variant="default"
              className={cn(
                'h-3 p-2 absolute -top-4 -left-[1px] !text-[10px] rounded-none rounded-t hover:bg-primary ',
                isActive ? '' : 'hidden',
              )}
            >
              {t('contentBuilder.editor.actionButtons.entity.column')}
              <GearIcon className="ml-1 h-2 w-2" />
            </Button>
          </Popover.Trigger>
        </Popover.Anchor>
        {props.children}
      </div>
      {isActive && (
        <Popover.Portal>
          <Popover.Content
            className="z-50 w-72 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            side="left"
            style={{ zIndex }}
            sideOffset={5}
          >
            <div className="flex flex-col gap-2.5">
              <Label>{t('contentBuilder.editor.column.width')}</Label>
              <div className="flex gap-x-2">
                {element.width?.type !== 'fill' && (
                  <Input
                    type="width"
                    value={element.width?.value}
                    placeholder={t('contentBuilder.editor.column.width')}
                    onChange={handleWidthValueChange}
                    className="bg-background flex-none w-[120px]"
                  />
                )}
                <Select
                  onValueChange={handleWidthTypeChange}
                  defaultValue={element.width?.type ?? 'percent'}
                >
                  <SelectTrigger className="shrink">
                    <SelectValue placeholder={t('contentBuilder.editor.width.selectType')} />
                  </SelectTrigger>
                  <SelectPortal style={{ zIndex: zIndex + 2 }}>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="percent">
                          {t('contentBuilder.editor.width.percent')}
                        </SelectItem>
                        <SelectItem value="pixels">
                          {t('contentBuilder.editor.width.pixels')}
                        </SelectItem>
                        <SelectItem value="fill">
                          {t('contentBuilder.editor.width.fill')}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </div>
              <Label>{t('contentBuilder.editor.column.distribute')}</Label>
              <Select
                onValueChange={handleDistributeValueChange}
                defaultValue={element.style.justifyContent}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('contentBuilder.editor.width.selectType')} />
                </SelectTrigger>
                <SelectPortal style={{ zIndex: zIndex + 2 }}>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="start">
                        {t('contentBuilder.editor.column.alignTop')}
                      </SelectItem>
                      <SelectItem value="center">
                        {t('contentBuilder.editor.column.alignCenter')}
                      </SelectItem>
                      <SelectItem value="end">
                        {t('contentBuilder.editor.column.alignBottom')}
                      </SelectItem>
                      <SelectItem value="space-between">
                        {t('contentBuilder.editor.column.justifyBetween')}
                      </SelectItem>
                      <SelectItem value="space-evenly">
                        {t('contentBuilder.editor.column.justifyEvenly')}
                      </SelectItem>
                      <SelectItem value="space-around">
                        {t('contentBuilder.editor.column.justifyAround')}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </SelectPortal>
              </Select>
              <Label htmlFor="spacing">{t('contentBuilder.editor.column.spacing')}</Label>
              <Input
                type="spacing"
                className="bg-background"
                id="spacing"
                value={element.style.marginRight}
                placeholder={t('contentBuilder.editor.column.spacing')}
                onChange={handleSpaceValueChange}
              />
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="flex-none hover:bg-red-200"
                        variant="ghost"
                        size="icon"
                        onClick={handleDelete}
                      >
                        <DeleteIcon className="fill-red-700" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        {t('contentBuilder.editor.actionButtons.delete', {
                          entity: t('contentBuilder.editor.actionButtons.entity.column'),
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="grow" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="flex-none"
                        variant="ghost"
                        size="icon"
                        onClick={handleAddLeftColumn}
                      >
                        <InsertColumnLeftIcon className="fill-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        {t('contentBuilder.editor.actionButtons.insertLeft', {
                          entity: t('contentBuilder.editor.actionButtons.entity.column'),
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex-none mx-1 leading-10">
                  {t('contentBuilder.editor.actionButtons.insert', {
                    entity: t('contentBuilder.editor.actionButtons.entity.column'),
                  })}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="flex-none"
                        variant="ghost"
                        size="icon"
                        onClick={handleAddRightColumn}
                      >
                        <InsertColumnRightIcon className="fill-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        {t('contentBuilder.editor.actionButtons.insertRight', {
                          entity: t('contentBuilder.editor.actionButtons.entity.column'),
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Popover.Arrow className="fill-slate-900" />
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
};

ColumnElement.display = 'ColumnElement';
