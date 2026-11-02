import { PopperContentFrame, PopperMadeWith } from '@usertour-packages/sdk';
import {
  LauncherContentWrapper,
  LauncherPopper,
  LauncherPopperContentPotal,
  LauncherRoot,
} from '@usertour-packages/sdk/src/launcher';
import {
  ContentEditorClickableElement,
  ContentEditorSerialize,
} from '@usertour-packages/shared-editor';
import { AssetAttributes, ShadowFrame } from '@usertour-packages/frame';
import {
  BizUserInfo,
  LauncherActionType,
  LauncherData,
  LauncherDataType,
  LauncherTriggerElement,
  LauncherTriggerEvent,
  RulesCondition,
  ThemeTypesSetting,
} from '@usertour/types';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Launcher } from '../core/launcher';
import { LauncherFocusProxy } from '../core/launcher-focus';
import { getElementLabel, getTargetIntro } from '../core/target-intro';
import { getTabbables } from '../core/tabbable';
import { LauncherStrings, getTranslations } from '../core/translations';
import { useEventHandlers } from '../hooks/use-event-handlers';
import { document, window } from '../utils/globals';
import { on, off } from '../utils/listener';

// Types
type LauncherWidgetProps = {
  launcher: Launcher;
};

type LauncherWidgetCoreProps = {
  data: LauncherData;
  handleActions: (actions: RulesCondition[]) => void;
  el: HTMLElement;
  target: Element;
  // False when scrolled out of view or covered; the keyboard button stays
  visible?: boolean;
  themeSettings: ThemeTypesSetting;
  zIndex: number;
  handleOnClick: ({ type, data }: ContentEditorClickableElement) => Promise<void>;
  userInfo: BizUserInfo;
  handleActive: () => void;
  removeBranding: boolean;
  assets: AssetAttributes[] | undefined;
};

type LauncherHandlers = {
  handleClick: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

// Hooks
const useLauncherHandlers = (
  data: LauncherData,
  actionType: LauncherActionType,
  setOpen: (open: boolean) => void,
  handleActive: () => void,
  handleActions: (actions: RulesCondition[]) => void,
  popperRef: React.RefObject<HTMLDivElement>,
): LauncherHandlers => {
  return useMemo(
    () => ({
      handleClick: () => {
        handleActive();
        if (actionType === LauncherActionType.SHOW_TOOLTIP) {
          setOpen(true);
        } else if (data) {
          handleActions(data.behavior.actions);
        }
      },
      handleMouseEnter: () => {
        handleActive();
        if (actionType === LauncherActionType.SHOW_TOOLTIP) {
          setOpen(true);
        } else if (data) {
          handleActions(data.behavior.actions);
        }
      },
      handleMouseLeave: () => {
        if (actionType === LauncherActionType.SHOW_TOOLTIP) {
          setTimeout(() => {
            if (!popperRef.current?.matches(':hover')) {
              setOpen(false);
            }
          }, 100);
        }
      },
    }),
    [data, actionType, setOpen, handleActive, handleActions, popperRef],
  );
};

const useClickOutside = (
  open: boolean,
  popperRef: React.RefObject<HTMLDivElement>,
  setOpen: (open: boolean) => void,
) => {
  useEffect(() => {
    if (!open || !document) return;

    // Handles clicks within the SDK's own document (outside the tooltip)
    const handleClickOutside = (event: MouseEvent) => {
      if (popperRef.current && !popperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    // Handles clicks on the parent page when the SDK is running inside an iframe.
    const handleWindowBlur = () => {
      requestAnimationFrame(() => {
        if (popperRef.current && !popperRef.current.contains(document!.activeElement)) {
          setOpen(false);
        }
      });
    };

    on(document, 'mousedown', handleClickOutside);
    window?.addEventListener('blur', handleWindowBlur);

    return () => {
      if (document) {
        off(document, 'mousedown', handleClickOutside);
      }
      window?.removeEventListener('blur', handleWindowBlur);
    };
  }, [open, setOpen]);
};

const usePopperMouseLeave = (
  popperRef: React.RefObject<HTMLDivElement>,
  actionType: LauncherActionType,
  triggerEvent: LauncherTriggerEvent,
  setOpen: (open: boolean) => void,
  open: boolean,
) => {
  useEffect(() => {
    const popper = popperRef.current;
    if (!popper) return;

    const handlePopperMouseLeave = () => {
      if (
        actionType === LauncherActionType.SHOW_TOOLTIP &&
        triggerEvent === LauncherTriggerEvent.HOVERED
      ) {
        setOpen(false);
      }
    };

    on(popper, 'mouseleave', handlePopperMouseLeave);
    return () => {
      off(popper, 'mouseleave', handlePopperMouseLeave);
    };
  }, [actionType, triggerEvent, setOpen, open]);
};

type PopperContentReadyInfo = { scope: Document | ShadowRoot; root: HTMLElement };

// The transparent outline shows in Windows high contrast mode, which drops shadows
const RING_STYLE: Record<string, string> = {
  'box-shadow': '0 0 0 2px #ffffff, 0 0 0 4px #1a1a1a',
  outline: '2px solid transparent',
  'outline-offset': '2px',
};

// Inline and !important so a cached stylesheet or page CSS can't affect it
const setRingStyle = (launcher: HTMLElement, focused: boolean) => {
  for (const [property, value] of Object.entries(RING_STYLE)) {
    if (focused) {
      launcher.style.setProperty(property, value, 'important');
    } else {
      launcher.style.removeProperty(property);
    }
  }
};

/**
 * Keyboard access through a hidden button next to the target (see LauncherFocusProxy).
 * Escape or tabbing out of the tooltip closes it and returns to the button.
 */
const useLauncherFocus = ({
  data,
  target,
  open,
  setOpen,
  handleClick,
  launcherRef,
  strings,
  lang,
  visible,
  drawn,
}: {
  data: LauncherData;
  target: Element;
  open: boolean;
  setOpen: (open: boolean) => void;
  handleClick: () => void;
  launcherRef: React.RefObject<HTMLButtonElement>;
  visible: boolean;
  drawn: boolean;
  strings: LauncherStrings;
  lang?: string;
}) => {
  const proxyRef = useRef<LauncherFocusProxy | null>(null);
  const focusTooltipRef = useRef(false);
  const tooltipFocusedRef = useRef(false);
  const hasPopup = data.behavior.actionType === LauncherActionType.SHOW_TOOLTIP;
  const label =
    data.type === LauncherDataType.BUTTON && data.buttonText?.trim()
      ? data.buttonText.trim()
      : strings.label(getElementLabel(target));

  const latest = useRef({ open, setOpen, handleClick, hasPopup, visible });
  latest.current = { open, setOpen, handleClick, hasPopup, visible };

  const syncLauncherFocused = useCallback(() => {
    const focused = !!proxyRef.current?.hasFocus();
    const launcher = launcherRef.current;
    if (launcher) {
      launcher.toggleAttribute('data-usertour-focused', focused);
      setRingStyle(launcher, focused);
    }
  }, [launcherRef]);

  const handleFocusChange = useCallback(
    (focused: boolean) => {
      syncLauncherFocused();
      if (focused && !latest.current.visible) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    },
    [syncLauncherFocused, target],
  );

  const closeTooltip = useCallback(() => {
    latest.current.setOpen(false);
    proxyRef.current?.focus();
  }, []);

  const getOptions = () => ({
    side: data.target.alignment.side ?? 'bottom',
    label,
    lang,
    hasPopup,
    expanded: open,
    onActivate: () => {
      const current = latest.current;
      if (current.hasPopup && current.open) {
        current.setOpen(false);
        return;
      }
      focusTooltipRef.current = current.hasPopup;
      if (!current.visible) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      current.handleClick();
    },
    onFocusChange: handleFocusChange,
    onEscape: closeTooltip,
  });

  useEffect(() => {
    const proxy = new LauncherFocusProxy({ target, ...getOptions() });
    proxyRef.current = proxy;
    return () => {
      proxyRef.current = null;
      proxy.destroy();
      const doc = target.ownerDocument;
      if (tooltipFocusedRef.current && (!doc.activeElement || doc.activeElement === doc.body)) {
        (target as HTMLElement).focus?.({ preventScroll: true });
      }
    };
    // Recreated for a new target only
  }, [target]);

  useEffect(() => {
    proxyRef.current?.update(getOptions());
  });

  useEffect(() => {
    syncLauncherFocused();
  }, [drawn, syncLauncherFocused]);

  useEffect(() => {
    if (!visible && !focusTooltipRef.current) {
      setOpen(false);
    }
  }, [visible, setOpen]);

  const listenersRef = useRef<(() => void) | null>(null);

  const handleTooltipReady = useCallback(
    ({ scope, root }: PopperContentReadyInfo, ready: boolean) => {
      listenersRef.current?.();
      listenersRef.current = null;

      if (!ready) {
        const doc = root.ownerDocument;
        if (tooltipFocusedRef.current && (!doc.activeElement || doc.activeElement === doc.body)) {
          proxyRef.current?.focus();
        }
        tooltipFocusedRef.current = false;
        return;
      }

      const handleFocusIn = () => {
        tooltipFocusedRef.current = true;
      };
      const handleFocusOut = (event: Event) => {
        if ((event as FocusEvent).relatedTarget) {
          tooltipFocusedRef.current = false;
        }
      };
      const handleKeyDown = (event: Event) => {
        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key !== 'Tab' || keyEvent.defaultPrevented) return;
        const tabbables = getTabbables(root);
        const active = scope.activeElement;
        const atStart = !tabbables.length || active === root || active === tabbables[0];
        const atEnd = !tabbables.length || active === tabbables[tabbables.length - 1];
        if (keyEvent.shiftKey && atStart) {
          keyEvent.preventDefault();
          closeTooltip();
        } else if (!keyEvent.shiftKey && atEnd) {
          // Tab continues from the button
          closeTooltip();
        }
      };
      scope.addEventListener('focusin', handleFocusIn);
      scope.addEventListener('focusout', handleFocusOut);
      scope.addEventListener('keydown', handleKeyDown);
      listenersRef.current = () => {
        scope.removeEventListener('focusin', handleFocusIn);
        scope.removeEventListener('focusout', handleFocusOut);
        scope.removeEventListener('keydown', handleKeyDown);
      };

      if (focusTooltipRef.current) {
        focusTooltipRef.current = false;
        requestAnimationFrame(() => {
          if (root.isConnected) {
            root.focus({ preventScroll: true });
          }
        });
      }
    },
    [closeTooltip],
  );

  useEffect(
    () => () => {
      listenersRef.current?.();
    },
    [],
  );

  return {
    dialog: { label, description: strings.tooltipHint, lang, onEscape: closeTooltip },
    handleTooltipReady,
  };
};

// Components
const LauncherTooltip = ({
  data,
  userInfo,
  handleOnClick,
  removeBranding,
  popperRef,
  dialog,
  targetIntro,
  onContentReady,
}: {
  data: LauncherData;
  userInfo: BizUserInfo;
  handleOnClick: (element: ContentEditorClickableElement) => Promise<void>;
  removeBranding: boolean;
  popperRef: React.RefObject<HTMLDivElement>;
  dialog: { label: string; description: string; lang?: string; onEscape: () => void };
  targetIntro?: string;
  onContentReady: (info: PopperContentReadyInfo, ready: boolean) => void;
}) => (
  <LauncherPopperContentPotal ref={popperRef}>
    <PopperContentFrame isolation="shadow" dialog={dialog} onContentReady={onContentReady}>
      {targetIntro && <p className="usertour-visually-hidden">{targetIntro}</p>}
      <ContentEditorSerialize
        contents={data.tooltip.content}
        onClick={handleOnClick}
        userInfo={userInfo}
      />
      {!removeBranding && <PopperMadeWith />}
    </PopperContentFrame>
  </LauncherPopperContentPotal>
);

export const LauncherWidgetCore = ({
  data,
  handleActions,
  el,
  target,
  themeSettings,
  zIndex,
  handleOnClick,
  userInfo,
  handleActive,
  removeBranding,
  assets,
  visible = true,
}: LauncherWidgetCoreProps) => {
  const widgetStrings = useMemo(() => getTranslations(), []);
  const actionType = data?.behavior?.actionType;
  const [open, setOpen] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const handleLauncherLoad = useCallback(() => {
    setDrawn(true);
  }, []);
  useEffect(() => {
    if (!visible) {
      setDrawn(false);
    }
  }, [visible]);
  const popperRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement>(el);
  triggerRef.current = el;

  const handlers = useLauncherHandlers(
    data,
    actionType,
    setOpen,
    handleActive,
    handleActions,
    popperRef,
  );
  useEventHandlers(data, launcherRef, triggerRef, handlers, visible && drawn);
  useClickOutside(open, popperRef, setOpen);
  usePopperMouseLeave(popperRef, actionType, data.behavior.triggerEvent, setOpen, open);
  const { dialog, handleTooltipReady } = useLauncherFocus({
    data,
    target,
    open,
    setOpen,
    handleClick: handlers.handleClick,
    launcherRef,
    strings: widgetStrings.launcher,
    lang: widgetStrings.lang,
    visible,
    drawn,
  });

  if (!visible) {
    return null;
  }

  return (
    <LauncherRoot themeSettings={themeSettings} data={data}>
      <LauncherPopper
        triggerRef={
          data.behavior.triggerElement === LauncherTriggerElement.LAUNCHER
            ? launcherRef
            : triggerRef
        }
        zIndex={zIndex}
        open={open}
        assets={assets}
        isIframeMode={true}
      >
        <LauncherTooltip
          data={data}
          userInfo={userInfo}
          handleOnClick={handleOnClick}
          removeBranding={removeBranding}
          popperRef={popperRef}
          dialog={dialog}
          targetIntro={open ? getTargetIntro(target, undefined, false) : undefined}
          onContentReady={handleTooltipReady}
        />
      </LauncherPopper>
      <ShadowFrame assets={assets} onLoad={handleLauncherLoad}>
        <LauncherContentWrapper zIndex={zIndex} referenceRef={triggerRef} ref={launcherRef} />
      </ShadowFrame>
    </LauncherRoot>
  );
};

export const LauncherWidget = ({ launcher }: LauncherWidgetProps) => {
  const store = useSyncExternalStore(
    launcher.getStore().subscribe,
    launcher.getStore().getSnapshot,
  );
  if (!store) {
    return <></>;
  }
  const {
    userInfo,
    content,
    zIndex,
    themeSettings,
    triggerRef,
    openState,
    sdkConfig,
    assets,
    iframeElementInfo,
  } = store;

  const data = content?.data as LauncherData | undefined;

  if (!themeSettings || !data || !triggerRef || launcher.isTemporarilyHidden()) {
    return <></>;
  }

  return (
    <LauncherWidgetCore
      data={data}
      handleActive={launcher.handleActive}
      handleActions={launcher.handleActions}
      themeSettings={themeSettings}
      zIndex={zIndex}
      handleOnClick={launcher.handleOnClick}
      userInfo={userInfo as BizUserInfo}
      el={triggerRef}
      target={iframeElementInfo?.element ?? triggerRef}
      removeBranding={sdkConfig.removeBranding}
      assets={assets}
      visible={!!openState}
    />
  );
};
