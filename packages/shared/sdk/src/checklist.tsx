import {
  ChecklistData,
  ChecklistItemType,
  ModalPosition,
  ThemeTypesSetting,
} from '@usertour/types';
import {
  forwardRef,
  useState,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  memo,
  useCallback,
} from 'react';
import {
  Popper,
  PopperContent,
  PopperModalContentPotal,
  PopperProps,
  PopperStaticContent,
  PopperContentFrame,
  PopperContentFrameProps,
  PopperContentProps,
  PopperContentReadyInfo,
} from './popper';
import { CheckmarkIcon, DropDownIcon } from '@usertour-packages/icons';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { computePositionStyle } from './utils/position';
import { AssetAttributes, Frame, ShadowFrame, useFrame } from '@usertour-packages/frame';
import { cn } from '@usertour/helpers';
import { Button } from '@usertour-packages/button';
import { useSize } from '@usertour-packages/react-use-size';
import {
  canCompleteChecklistItem,
  checklistCompletedItemsCount,
  checklistIsCompleted,
  checklistProgress,
  checklistUnCompletedItemsCount,
  checklistVisibleItemsCount,
} from './utils/content';
import { useSettingsStyles } from './hooks/use-settings-styles';

// Passed in the page language by the SDK; previews use the English defaults
export interface ChecklistStrings {
  lang?: string;
  // e.g. "Get started, 3 tasks left"
  launcherLabel: (buttonText: string, remaining: number) => string;
  collapse: string;
  panelHint: string;
  tasks: string;
  completed: string;
  notCompleted: string;
  locked: string;
  progressLabel: string;
  // e.g. "2 of 4 tasks completed"
  progress: (done: number, total: number) => string;
  dismiss: string;
  dismissConfirm: string;
  confirmDismiss: string;
  cancel: string;
}

export const defaultChecklistStrings: ChecklistStrings = {
  launcherLabel: (buttonText, remaining) =>
    remaining === 0
      ? `${buttonText}, all tasks completed`
      : `${buttonText}, ${remaining} ${remaining === 1 ? 'task' : 'tasks'} left`,
  collapse: 'Collapse checklist',
  panelHint: 'Press Escape to collapse the checklist.',
  tasks: 'Tasks',
  completed: 'completed',
  notCompleted: 'not completed',
  locked: 'Complete the previous tasks first.',
  progressLabel: 'Progress',
  progress: (done, total) => `${done} of ${total} tasks completed`,
  dismiss: 'Dismiss checklist',
  dismissConfirm: 'Dismiss checklist?',
  confirmDismiss: 'Yes, dismiss',
  cancel: 'Cancel',
};

type ChecklistFocusOwner = 'launcher' | 'panel';

// returnFocus reopens the panel on the task that started the flow
export type ChecklistFocusHandle = {
  focus: () => boolean;
  returnFocus: (fromWidget: boolean) => boolean;
};

interface ChecklistRootContextValue {
  globalStyle: string;
  themeSetting?: ThemeTypesSetting;
  data: ChecklistData;
  isOpen: boolean;
  isAllCompleted: boolean;
  unCompletedItemsCount: number;
  progress: number;
  updateItemStatus: (itemId: string, isCompleted: boolean) => void;
  showDismissConfirm: boolean;
  setShowDismissConfirm: (showDismissConfirm: boolean) => void;
  onDismiss?: () => Promise<void>;
  handleExpandedChange?: (expanded: boolean) => Promise<void>;
  // Animation state tracking
  pendingAnimationItems: Set<string>;
  removePendingAnimation: (itemId: string) => void;
  zIndex: number;
  strings: ChecklistStrings;
  trackFocus: (owner: ChecklistFocusOwner) => {
    onFocus: () => void;
    onBlur: (event: React.FocusEvent<HTMLElement>) => void;
  };
  setLauncherButton: (element: HTMLButtonElement | null) => void;
  handlePanelReady: (info: PopperContentReadyInfo, ready: boolean) => void;
  focusDismissRef: React.MutableRefObject<boolean>;
  setItemButton: (itemId: string, element: HTMLButtonElement | null) => void;
  setActivatedItem: (itemId: string) => void;
}

const ChecklistRootContext = createContext<ChecklistRootContextValue | null>(null);

const useChecklistRootContext = () => {
  const context = useContext(ChecklistRootContext);
  if (!context) {
    throw new Error('useChecklistRootContext must be used within a ChecklistRoot.');
  }
  return context;
};

interface ChecklistRootProps {
  children: React.ReactNode;
  themeSettings: ThemeTypesSetting;
  data: ChecklistData;
  defaultOpen?: boolean;
  expanded?: boolean;
  onDismiss?: () => Promise<void>;
  onExpandedChange?: (expanded: boolean) => void;
  reportExpandedChangeEvent?: (expanded: boolean) => Promise<void>;
  zIndex: number;
  strings?: ChecklistStrings;
  focusRef?: React.MutableRefObject<ChecklistFocusHandle | null>;
}

// Only when focus was lost: never steals it from the page or a tour step
const focusIfLost = (element: HTMLElement) => {
  const doc = element.ownerDocument;
  const frameElement = doc.defaultView?.frameElement ?? null;
  const pageDocument = frameElement?.ownerDocument ?? doc;
  const active = pageDocument.activeElement;
  const root = element.getRootNode();
  const ownHost =
    root.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? (root as ShadowRoot).host : frameElement;
  const isLost = !active || active === pageDocument.body || active === pageDocument.documentElement;
  if (!isLost && active !== ownHost) {
    return;
  }
  element.focus({ preventScroll: true });
};

const ChecklistRoot = (props: ChecklistRootProps) => {
  const {
    children,
    data: initialData,
    defaultOpen = true,
    expanded,
    onDismiss,
    onExpandedChange,
    reportExpandedChangeEvent,
    zIndex,
    themeSettings,
    strings = defaultChecklistStrings,
    focusRef,
  } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(themeSettings);
  const [data, setData] = useState(initialData);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [pendingAnimationItems, setPendingAnimationItems] = useState<Set<string>>(new Set());
  const [prevData, setPrevData] = useState(initialData);

  // Use expanded from store if provided, otherwise use local state
  const isOpen = expanded !== undefined ? expanded : defaultOpen;
  const isAllCompleted = checklistIsCompleted(data.items);
  const unCompletedItemsCount = checklistUnCompletedItemsCount(data.items);
  const progress = checklistProgress(data.items);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  //manual control open state
  const handleExpandedChange = useCallback(
    async (open: boolean) => {
      onExpandedChange?.(open);
      await reportExpandedChangeEvent?.(open);
    },
    [reportExpandedChangeEvent],
  );

  // Track completion changes and add to pending animations if checklist is closed
  useEffect(() => {
    if (!isOpen) {
      // Check for newly completed items
      for (const item of data.items) {
        const prevItem = prevData.items.find((prevItem) => prevItem.id === item.id);
        if (item.isCompleted && prevItem && !prevItem.isCompleted) {
          setPendingAnimationItems((prev) => new Set(prev).add(item.id));
        }
      }
    }
    setPrevData(data);
  }, [data, isOpen]);

  const updateItemStatus = (itemId: string, isCompleted: boolean) => {
    setData((prevData) => ({
      ...prevData,
      items: prevData.items.map((item) => (item.id === itemId ? { ...item, isCompleted } : item)),
    }));
  };

  const removePendingAnimation = useCallback((itemId: string) => {
    setPendingAnimationItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const focusOwnerRef = useRef<ChecklistFocusOwner | null>(null);
  const launcherButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRootRef = useRef<HTMLElement | null>(null);
  const focusDismissRef = useRef(false);
  const itemButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const activatedItemRef = useRef<string | null>(null);
  const pendingItemFocusRef = useRef<string | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const setItemButton = useCallback((itemId: string, element: HTMLButtonElement | null) => {
    if (element) {
      itemButtonsRef.current.set(itemId, element);
    } else {
      itemButtonsRef.current.delete(itemId);
    }
  }, []);

  const setActivatedItem = useCallback((itemId: string) => {
    activatedItemRef.current = itemId;
  }, []);

  const trackFocus = useCallback(
    (owner: ChecklistFocusOwner) => ({
      onFocus: () => {
        focusOwnerRef.current = owner;
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        const element = event.currentTarget;
        setTimeout(() => {
          if (
            focusOwnerRef.current === owner &&
            element.isConnected &&
            !element.matches(':focus-within')
          ) {
            focusOwnerRef.current = null;
          }
        }, 0);
      },
    }),
    [],
  );

  // Focus follows collapse/expand between the launcher and the panel
  const setLauncherButton = useCallback((element: HTMLButtonElement | null) => {
    launcherButtonRef.current = element;
    if (element && focusOwnerRef.current === 'panel') {
      focusOwnerRef.current = null;
      focusIfLost(element);
    }
  }, []);

  const handlePanelReady = useCallback((info: PopperContentReadyInfo, ready: boolean) => {
    panelRootRef.current = ready ? info.root : null;
    if (!ready) {
      return;
    }
    const pendingItemId = pendingItemFocusRef.current;
    if (pendingItemId) {
      pendingItemFocusRef.current = null;
      focusOwnerRef.current = null;
      requestAnimationFrame(() => {
        const button = itemButtonsRef.current.get(pendingItemId);
        (button?.isConnected ? button : info.root).focus();
      });
      return;
    }
    activatedItemRef.current = null;
    if (focusOwnerRef.current === 'launcher') {
      focusOwnerRef.current = null;
      requestAnimationFrame(() => focusIfLost(info.root));
    }
  }, []);

  useEffect(() => {
    if (!focusRef) {
      return;
    }
    const focus = () => {
      const element = panelRootRef.current ?? launcherButtonRef.current;
      if (!element?.isConnected) {
        return false;
      }
      element.focus();
      return true;
    };
    const returnFocus = (fromWidget: boolean) => {
      const itemId = activatedItemRef.current;
      activatedItemRef.current = null;
      if (!itemId) {
        return fromWidget && focus();
      }
      const button = itemButtonsRef.current.get(itemId);
      if (isOpenRef.current && button?.isConnected) {
        button.focus();
        return true;
      }
      if (isOpenRef.current) {
        return focus();
      }
      pendingItemFocusRef.current = itemId;
      handleExpandedChange(true);
      return true;
    };
    focusRef.current = { focus, returnFocus };
    return () => {
      focusRef.current = null;
    };
  }, [focusRef, handleExpandedChange]);

  return (
    <ChecklistRootContext.Provider
      value={{
        globalStyle,
        themeSetting,
        data,
        isOpen,
        isAllCompleted,
        unCompletedItemsCount,
        progress,
        updateItemStatus,
        showDismissConfirm,
        setShowDismissConfirm,
        onDismiss,
        handleExpandedChange,
        pendingAnimationItems,
        removePendingAnimation,
        zIndex,
        strings,
        trackFocus,
        setLauncherButton,
        handlePanelReady,
        focusDismissRef,
        setItemButton,
        setActivatedItem,
      }}
    >
      {children}
    </ChecklistRootContext.Provider>
  );
};

ChecklistRoot.displayName = 'ChecklistRoot';

interface ChecklistCheckedProps {
  isChecked: boolean;
  isShowAnimation: boolean;
}

const ChecklistChecked = forwardRef<HTMLSpanElement, ChecklistCheckedProps>((props, ref) => {
  const { isChecked, isShowAnimation } = props;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        'flex-none w-8 h-8 border-2 border-transparent rounded-full flex justify-center items-center mr-3 text-sm text-white',
        isChecked
          ? 'bg-sdk-checklist-checkmark'
          : 'border border-sdk-foreground/25 bg-sdk-background',
        isShowAnimation ? 'motion-safe:animate-pop-scale' : '',
      )}
    >
      {isChecked && <CheckmarkIcon className="w-5 h-5 stroke-white" />}
    </span>
  );
});

ChecklistChecked.displayName = 'ChecklistChecked';

const ChecklistProgress = memo(
  forwardRef<HTMLDivElement, { width?: number }>(({ width }, ref) => {
    const { progress, data, strings } = useChecklistRootContext();

    const finalProgress = width ?? progress ?? 0;
    const done = checklistCompletedItemsCount(data.items);
    const total = checklistVisibleItemsCount(data.items);

    return (
      // biome-ignore lint/a11y/useFocusableInteractive: a progress bar is read-only, not a tab stop
      <div
        className="w-full bg-sdk-foreground rounded-full my-3"
        ref={ref}
        role="progressbar"
        aria-label={strings.progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={finalProgress}
        aria-valuetext={strings.progress(done, total)}
      >
        <div
          className={cn(
            'text-sdk-background font-medium p-1 px-2 leading-none rounded-full text-left',
            finalProgress > 0 && 'bg-sdk-progress',
          )}
          style={{ width: `${finalProgress}%` }}
        >
          {finalProgress}%
        </div>
      </div>
    );
  }),
);

ChecklistProgress.displayName = 'ChecklistProgress';

const BUTTON_RESET =
  'appearance-none border-0 m-0 p-0 bg-transparent text-inherit [font:inherit] text-left';

interface ChecklistLauncherContentProps {
  buttonText: string;
  height?: string | number;
  onClick?: () => void;
  number?: number;
  isCompleted?: boolean;
  onSizeChange?: (rect: { width: number; height: number }) => void;
}
const ChecklistLauncherContent = forwardRef<HTMLButtonElement, ChecklistLauncherContentProps>(
  (props, ref) => {
    const { buttonText, height, onClick, number = 1, isCompleted, onSizeChange } = props;
    const { strings, trackFocus } = useChecklistRootContext();
    const paddingLeft = height ? `${Number(height) / 2}px` : undefined;
    const paddingRight = height ? `${Number(height) / 2}px` : undefined;

    const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
    const rect = useSize(contentRef);

    useEffect(() => {
      if (rect) {
        onSizeChange?.(rect);
      }
    }, [rect]);

    return (
      <button
        type="button"
        ref={ref}
        style={{
          height,
        }}
        className={cn(
          BUTTON_RESET,
          'usertour-checklist-launcher-button rounded-sdk-checklist-trigger h-full w-full flex bg-sdk-checklist-trigger-background cursor-pointer items-center justify-center hover:bg-sdk-checklist-trigger-hover-background',
        )}
        aria-label={strings.launcherLabel(buttonText, isCompleted ? 0 : number)}
        aria-haspopup="dialog"
        aria-expanded={false}
        lang={strings.lang}
        onClick={onClick}
        {...trackFocus('launcher')}
      >
        <div
          ref={setContentRef}
          className="flex whitespace-nowrap	"
          style={{
            paddingLeft,
            paddingRight,
          }}
        >
          <div className="overflow-hidden	text-sdk-checklist-trigger-font h-6 font-sdk-checklist-trigger text-sdk-base flex items-center justify-center">
            {buttonText}
          </div>
          <div
            aria-hidden="true"
            className="rounded-full w-6 h-6 text-sdk-base bg-sdk-checklist-trigger-counter-background text-sdk-checklist-trigger-counter-font ml-1 flex items-center justify-center"
          >
            {isCompleted ? (
              <CheckmarkIcon className="w-5 h-5 stroke-sdk-checklist-trigger-counter-font" />
            ) : (
              number
            )}
          </div>
        </div>
      </button>
    );
  },
);

ChecklistLauncherContent.displayName = 'ChecklistLauncherContent';

const ChecklistLauncher = forwardRef<HTMLDivElement, { onClick?: () => void }>((props, ref) => {
  const { onClick } = props;
  const { themeSetting, data, zIndex, isAllCompleted, unCompletedItemsCount } =
    useChecklistRootContext();
  const style = computePositionStyle(
    themeSetting?.checklistLauncher.placement.position as ModalPosition,
    themeSetting?.checklistLauncher.placement.positionOffsetX ?? 0,
    themeSetting?.checklistLauncher.placement.positionOffsetY ?? 0,
  );

  return (
    <div
      ref={ref}
      className="usertour-widget-checklist-launcher usertour-widget-checklist-launcher--position-fixed"
      style={{
        zIndex,
        ...style,
        height: themeSetting?.checklistLauncher.height,
        borderRadius: themeSetting?.checklistLauncher.borderRadius,
      }}
    >
      <ChecklistLauncherContent
        buttonText={data.buttonText}
        height={themeSetting?.checklistLauncher.height}
        onClick={onClick}
        number={unCompletedItemsCount}
        isCompleted={isAllCompleted}
      />
    </div>
  );
});

ChecklistLauncher.displayName = 'ChecklistLauncher';

interface ChecklistContainerProps {
  children: React.ReactNode;
}

const ChecklistContainer = forwardRef<HTMLDivElement, ChecklistContainerProps>(
  ({ children }, ref) => {
    const { globalStyle } = useChecklistRootContext();
    const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
      if (el?.style) {
        el.style.cssText = globalStyle;
      }
    });

    return <div ref={composedRefs}>{children}</div>;
  },
);

ChecklistContainer.displayName = 'ChecklistContainer';

const ChecklistPopper = forwardRef<HTMLDivElement, Omit<PopperProps, 'globalStyle'>>(
  (props, ref) => {
    const { children, ...popperProps } = props;
    const { globalStyle, isOpen, themeSetting, handleExpandedChange } = useChecklistRootContext();

    // Memoize the launcher click handler to prevent unnecessary re-renders
    const handleLauncherClick = useCallback(async () => {
      await handleExpandedChange?.(true);
    }, [handleExpandedChange]);

    // Memoize the modal content props to prevent unnecessary re-renders
    const modalContentProps = useMemo(
      () => ({
        position: themeSetting?.checklist.placement.position as ModalPosition,
        positionOffsetX: themeSetting?.checklist.placement.positionOffsetX,
        positionOffsetY: themeSetting?.checklist.placement.positionOffsetY,
        enabledBackdrop: false,
        width: `${themeSetting?.checklist.width}px`,
      }),
      [
        themeSetting?.checklist.placement.position,
        themeSetting?.checklist.placement.positionOffsetX,
        themeSetting?.checklist.placement.positionOffsetY,
        themeSetting?.checklist.width,
      ],
    );

    // Memoize the popper props to prevent unnecessary re-renders
    const optimizedPopperProps = useMemo(
      () => ({
        ...popperProps,
        triggerRef: undefined,
        open: isOpen,
        globalStyle,
      }),
      [popperProps, isOpen, globalStyle],
    );

    // Early return for closed state
    if (!isOpen) {
      return <ChecklistLauncher onClick={handleLauncherClick} />;
    }

    // Main content when open
    return (
      <Popper ref={ref} {...optimizedPopperProps}>
        <PopperModalContentPotal {...modalContentProps}>{children}</PopperModalContentPotal>
      </Popper>
    );
  },
);

ChecklistPopper.displayName = 'ChecklistPopper';

type ChecklistPopperUseIframeProps = Omit<PopperProps, 'globalStyle'> &
  Pick<PopperContentFrameProps, 'isolation'>;

const ChecklistPopperUseIframe = forwardRef<HTMLDivElement, ChecklistPopperUseIframeProps>(
  (props, ref) => {
    const { children, assets, isolation, ...popperProps } = props;
    const {
      globalStyle,
      isOpen,
      themeSetting,
      data,
      strings,
      handleExpandedChange,
      handlePanelReady,
      trackFocus,
    } = useChecklistRootContext();

    // Memoize the modal content props to prevent unnecessary re-renders
    const modalContentProps = useMemo(
      () => ({
        position: themeSetting?.checklist.placement.position as ModalPosition,
        positionOffsetX: themeSetting?.checklist.placement.positionOffsetX,
        positionOffsetY: themeSetting?.checklist.placement.positionOffsetY,
        enabledBackdrop: false,
        width: `${themeSetting?.checklist.width}px`,
      }),
      [
        themeSetting?.checklist.placement.position,
        themeSetting?.checklist.placement.positionOffsetX,
        themeSetting?.checklist.placement.positionOffsetY,
        themeSetting?.checklist.width,
      ],
    );

    // Memoize the popper props to prevent unnecessary re-renders
    const optimizedPopperProps = useMemo(
      () => ({
        ...popperProps,
        triggerRef: undefined,
        open: isOpen,
        globalStyle,
        assets,
      }),
      [popperProps, isOpen, globalStyle, assets],
    );

    // Non-modal: the page stays usable
    const dialog = useMemo(
      () => ({
        label: data.buttonText,
        description: strings.panelHint,
        lang: strings.lang,
        onEscape: () => handleExpandedChange?.(false),
      }),
      [data.buttonText, strings, handleExpandedChange],
    );

    // Early return for closed state
    if (!isOpen) {
      return <ChecklistLauncherFrame assets={assets} isolation={isolation} />;
    }

    // Main content when open
    return (
      <Popper ref={ref} {...optimizedPopperProps} isIframeMode={true}>
        <PopperModalContentPotal {...modalContentProps}>
          <PopperContentFrame
            ref={ref}
            {...props}
            isolation={isolation}
            dialog={dialog}
            onContentReady={handlePanelReady}
            focusHandlers={trackFocus('panel')}
          >
            {children}
          </PopperContentFrame>
        </PopperModalContentPotal>
      </Popper>
    );
  },
);

interface ChecklistLauncherFrameProps {
  assets: AssetAttributes[] | undefined;
  isolation?: PopperContentFrameProps['isolation'];
}
const ChecklistLauncherFrame = forwardRef<HTMLIFrameElement, ChecklistLauncherFrameProps>(
  (props, ref) => {
    const { assets, isolation = 'iframe' } = props;
    const { globalStyle, themeSetting, zIndex } = useChecklistRootContext();
    const [launcherRect, setLauncherRect] = useState<{ width: number; height: number } | null>(
      null,
    );

    const style = computePositionStyle(
      themeSetting?.checklistLauncher.placement.position as ModalPosition,
      themeSetting?.checklistLauncher.placement.positionOffsetX ?? 0,
      themeSetting?.checklistLauncher.placement.positionOffsetY ?? 0,
    );

    const width = launcherRect?.width ? `${launcherRect?.width}px` : undefined;
    const launcherStyle = {
      zIndex,
      ...style,
      height: themeSetting?.checklistLauncher.height,
      borderRadius: themeSetting?.checklistLauncher.borderRadius,
      width,
    };
    const className =
      'usertour-widget-checklist-launcher usertour-widget-checklist-launcher--position-fixed';

    if (isolation === 'shadow') {
      // The shadow host resets its styles, so a wrapper positions it
      return (
        <div className={className} style={launcherStyle}>
          <ShadowFrame assets={assets}>
            <ChecklistLauncherInFrame globalStyle={globalStyle} onSizeChange={setLauncherRect} />
          </ShadowFrame>
        </div>
      );
    }

    return (
      <>
        <Frame assets={assets} ref={ref} className={className} defaultStyle={launcherStyle}>
          <ChecklistLauncherInFrame globalStyle={globalStyle} onSizeChange={setLauncherRect} />
        </Frame>
      </>
    );
  },
);

ChecklistLauncherFrame.displayName = 'ChecklistLauncherFrame';

const ChecklistLauncherInFrame = forwardRef<HTMLDivElement, PopperContentProps>((props, _) => {
  const { globalStyle, onSizeChange } = props;
  const {
    data,
    themeSetting,
    handleExpandedChange,
    isAllCompleted,
    unCompletedItemsCount,
    setLauncherButton,
  } = useChecklistRootContext();
  const { document, scope, container } = useFrame();
  const body = scope.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? container : document.body;

  useEffect(() => {
    if (globalStyle) {
      body.style.cssText = globalStyle;
      body.classList.add('usertour-widget-root');
    }
  }, [globalStyle, body]);

  return (
    <ChecklistLauncherContent
      ref={setLauncherButton}
      buttonText={data.buttonText}
      height={themeSetting?.checklistLauncher.height}
      number={unCompletedItemsCount}
      isCompleted={isAllCompleted}
      onClick={async () => await handleExpandedChange?.(true)}
      onSizeChange={onSizeChange}
    />
  );
});

const ChecklistStaticPopper = forwardRef<
  HTMLDivElement,
  Omit<PopperProps, 'globalStyle' | 'zIndex'>
>((props, ref) => {
  const { children, ...popperProps } = props;
  const { globalStyle, zIndex } = useChecklistRootContext();

  // Memoize the popper props to prevent unnecessary re-renders
  const optimizedPopperProps = useMemo(
    () => ({
      ...popperProps,
      triggerRef: undefined,
      open: true,
      globalStyle,
      zIndex,
    }),
    [popperProps, globalStyle, zIndex],
  );

  // Memoize the static content props
  const staticContentProps = useMemo(
    () => ({
      ref,
      globalStyle,
      height: 'auto',
      width: '360px',
      showArrow: false,
    }),
    [globalStyle],
  );

  return (
    <Popper {...optimizedPopperProps}>
      <PopperStaticContent {...staticContentProps}>{children}</PopperStaticContent>
    </Popper>
  );
});

ChecklistStaticPopper.displayName = 'ChecklistStaticPopper';

const ChecklistDropdown = forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    const { handleExpandedChange, strings } = useChecklistRootContext();
    return (
      <button
        type="button"
        className={cn(
          BUTTON_RESET,
          'rounded-full h-[25px] w-[25px] inline-flex items-center justify-center text-sdk-xbutton absolute top-[5px] right-[5px] hover:bg-sdk-primary/40 outline-none cursor-pointer',
        )}
        ref={ref}
        aria-label={strings.collapse}
        aria-expanded={true}
        onClick={async () => await handleExpandedChange?.(false)}
        {...props}
      >
        <DropDownIcon height={24} width={24} aria-hidden="true" />
      </button>
    );
  },
);

ChecklistDropdown.displayName = 'ChecklistDropdown';

interface ChecklistItemsProps {
  onClick?: (item: ChecklistItemType, index: number) => void;
  disabledUpdate?: boolean;
}
const ChecklistItems = forwardRef<HTMLUListElement, ChecklistItemsProps>(
  ({ onClick, disabledUpdate }, ref) => {
    const { data, updateItemStatus, themeSetting, strings, setActivatedItem } =
      useChecklistRootContext();

    const textDecoration = themeSetting?.checklist.completedTaskTextDecoration;

    const handleItemClick = useCallback(
      (item: ChecklistItemType, index: number) => {
        setActivatedItem(item.id);
        if (disabledUpdate) {
          onClick?.(item, index);
          return;
        }
        if (!item.isCompleted) {
          updateItemStatus(item.id, !item.isCompleted);
        }
        onClick?.(item, index);
      },
      [onClick, updateItemStatus, disabledUpdate, setActivatedItem],
    );

    return (
      <ul
        ref={ref}
        aria-label={strings.tasks}
        className="flex flex-col -mx-[24px] list-none m-0 p-0"
      >
        {data.items
          .filter((item) => item.isVisible !== false)
          .map((item, index) => (
            <ChecklistItem
              key={item.id}
              item={item}
              index={index}
              onClick={handleItemClick}
              textDecoration={textDecoration}
            />
          ))}
      </ul>
    );
  },
);

ChecklistItems.displayName = 'ChecklistItems';

const ChecklistDismissConfirm = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const { setShowDismissConfirm, onDismiss, strings, focusDismissRef } =
      useChecklistRootContext();
    const questionId = useId();
    const questionRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
      questionRef.current?.focus();
    }, []);

    const handleCancel = () => {
      focusDismissRef.current = true;
      setShowDismissConfirm(false);
    };

    return (
      <div
        ref={ref}
        {...props}
        // biome-ignore lint/a11y/useSemanticElements: a fieldset is for form fields; this groups a question with its answers
        role="group"
        aria-labelledby={questionId}
        className="flex flex-col space-y-2"
      >
        <p id={questionId} ref={questionRef} tabIndex={-1} className="text-sdk-base m-0">
          {strings.dismissConfirm}
        </p>
        <div className="flex flex-row space-x-2 items-center justify-center pb-2">
          <Button forSdk onClick={onDismiss}>
            {strings.confirmDismiss}
          </Button>
          <Button forSdk variant="secondary" onClick={handleCancel}>
            {strings.cancel}
          </Button>
        </div>
      </div>
    );
  },
);

ChecklistDismissConfirm.displayName = 'ChecklistDismissConfirm';

const ChecklistDismiss = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const { data, onDismiss, setShowDismissConfirm, isAllCompleted, strings, focusDismissRef } =
      useChecklistRootContext();

    const handleDismiss = useCallback(() => {
      if (isAllCompleted) {
        onDismiss?.();
      } else {
        setShowDismissConfirm(true);
      }
    }, [isAllCompleted, onDismiss, setShowDismissConfirm]);

    const buttonRef = useCallback(
      (element: HTMLButtonElement | null) => {
        if (element && focusDismissRef.current) {
          focusDismissRef.current = false;
          element.focus();
        }
      },
      [focusDismissRef],
    );

    // Return placeholder if dismiss is prevented
    if (data.preventDismissChecklist) {
      return <div className="h-4" ref={ref} {...props} />;
    }

    const textClassName = cn(
      BUTTON_RESET,
      'text-right cursor-pointer',
      isAllCompleted
        ? 'text-sdk-link hover:text-sdk-link/80 font-sdk-bold'
        : 'text-sdk-foreground/50 hover:text-sdk-foreground/80',
    );

    return (
      <div className="flex justify-end" ref={ref} {...props}>
        <button type="button" ref={buttonRef} className={textClassName} onClick={handleDismiss}>
          {strings.dismiss}
        </button>
      </div>
    );
  },
);

ChecklistDismiss.displayName = 'ChecklistDismiss';

const ChecklistPopperContent = PopperContent;

ChecklistPopperContent.displayName = 'ChecklistPopperContent';

const ChecklistPopperContentBody = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const { showDismissConfirm } = useChecklistRootContext();
  if (showDismissConfirm) {
    return <ChecklistDismissConfirm />;
  }
  return children;
};

ChecklistPopperContentBody.displayName = 'ChecklistPopperContentBody';

interface ChecklistItemProps {
  item: ChecklistItemType;
  index: number;
  onClick: (item: ChecklistItemType, index: number) => void;
  textDecoration?: string;
}

const ChecklistItem = (props: ChecklistItemProps) => {
  const { item, index, onClick, textDecoration = 'line-through' } = props;
  const { isOpen, pendingAnimationItems, removePendingAnimation, data, strings, setItemButton } =
    useChecklistRootContext();
  const buttonRef = useCallback(
    (element: HTMLButtonElement | null) => setItemButton(item.id, element),
    [setItemButton, item.id],
  );
  const [prevIsCompleted, setPrevIsCompleted] = useState(item.isCompleted);
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false);
  const descriptionId = useId();
  const lockedId = useId();

  const isCompleted = useMemo(() => {
    return item.isCompleted;
  }, [item.isCompleted]);

  // Handle animation logic
  useEffect(() => {
    // Case 1: Item was just completed while checklist is open
    if (isCompleted && !prevIsCompleted && isOpen) {
      setShouldShowAnimation(true);
      const timer = setTimeout(() => {
        setShouldShowAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Case 2: Item has pending animation (completed while closed) and checklist is now open
    if (isOpen && isCompleted && pendingAnimationItems.has(item.id)) {
      setShouldShowAnimation(true);
      const timer = setTimeout(() => {
        removePendingAnimation(item.id);
        setShouldShowAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Case 3: External animation control via item.isShowAnimation
    if (isOpen && isCompleted && item.isShowAnimation) {
      setShouldShowAnimation(true);
      const timer = setTimeout(() => {
        setShouldShowAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    setPrevIsCompleted(isCompleted);
  }, [
    isCompleted,
    isOpen,
    prevIsCompleted,
    pendingAnimationItems,
    item.id,
    removePendingAnimation,
    item.isShowAnimation,
  ]);

  // Check if this item can be clicked based on completion order
  const isClickable = useMemo(() => {
    return canCompleteChecklistItem(data.completionOrder, data.items, item);
  }, [data.completionOrder, data.items, item]);

  // Reset animation state when item becomes uncompleted
  useEffect(() => {
    if (!isCompleted) {
      setShouldShowAnimation(false);
    }
  }, [isCompleted]);

  const describedBy = [item.description && descriptionId, !isClickable && lockedId]
    .filter(Boolean)
    .join(' ');

  return (
    <li className="m-0 p-0">
      <button
        type="button"
        ref={buttonRef}
        className={cn(
          BUTTON_RESET,
          'w-full flex items-center cursor-pointer px-[24px] py-3 hover:bg-sdk-foreground/5 transition-colors',
          isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
        )}
        // Locked tasks stay focusable so screen readers can say why
        aria-disabled={isClickable ? undefined : true}
        aria-describedby={describedBy || undefined}
        onClick={() => (isClickable ? onClick(item, index) : undefined)}
      >
        <ChecklistChecked isChecked={isCompleted} isShowAnimation={shouldShowAnimation} />
        <span
          className={cn(
            'grow flex flex-col items-start',
            isCompleted && `${textDecoration} text-sdk-foreground/60`,
          )}
        >
          <span className="text-sdk-base font-sdk-bold">
            {item.name}
            <span className="usertour-visually-hidden">
              , {isCompleted ? strings.completed : strings.notCompleted}
            </span>
          </span>
          {item.description && (
            <span
              id={descriptionId}
              aria-hidden="true"
              className="text-sdk-xs opacity-75 leading-3"
            >
              {item.description}
            </span>
          )}
          {!isClickable && (
            <span id={lockedId} aria-hidden="true" className="usertour-visually-hidden">
              {strings.locked}
            </span>
          )}
        </span>
      </button>
    </li>
  );
};

export {
  ChecklistRoot,
  ChecklistPopper,
  ChecklistPopperContent,
  ChecklistProgress,
  ChecklistChecked,
  ChecklistLauncher,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistDismiss,
  ChecklistStaticPopper,
  ChecklistContainer,
  ChecklistPopperUseIframe,
  ChecklistPopperContentBody,
};
