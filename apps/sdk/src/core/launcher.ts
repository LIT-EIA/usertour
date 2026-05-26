import { ContentEditorClickableElement } from '@usertour-packages/shared-editor';
import { BizEvents, EventAttributes, LauncherData } from '@usertour/types';
import { ContentActionsItemType, RulesCondition } from '@usertour/types';
import { evalCode } from '@usertour/helpers';
import { LauncherStore } from '../types/store';
import { AppEvents } from '../utils/event';
import { document, window } from '../utils/globals';
import { BaseContent } from './base-content';
import { ElementWatcher } from './element-watcher';
import { iframeUtils, IframeElementInfo } from '../utils/iframe-utils';

export class Launcher extends BaseContent<LauncherStore> {
  private watcher: ElementWatcher | null = null;
  private iframePositionUpdateCleanup: (() => void) | null = null;
  private scrollVisibilityCleanup: (() => void) | null = null;
  private domRemovalObserver: MutationObserver | null = null;
  private isRefindingElement = false;

  /**
   * Monitors the launcher's visibility state and ensures it's properly handled
   * This method:
   * 1. Activates content conditions to check if the launcher should be shown
   * 2. Handles the visibility state of the launcher based on conditions
   *
   * @returns {Promise<void>} A promise that resolves when monitoring is complete
   */
  async monitor(): Promise<void> {
    // First, check and activate any content conditions
    await this.activeContentConditions();

    // Check and update theme settings if needed
    await this.checkAndUpdateThemeSettings();

    // Then, handle the visibility state based on conditions
    await this.handleVisibilityState();
  }

  /**
   * Handles the visibility state of the launcher based on various conditions
   * This method manages the launcher's visibility by checking:
   * 1. If the launcher has started and not been dismissed
   * 2. If the target element is visible in the viewport
   * 3. If the launcher is temporarily hidden
   */
  private async handleVisibilityState() {
    // Early return if launcher hasn't started, is dismissed, or watcher is not initialized
    if (!this.hasStarted() || this.hasDismissed() || !this.watcher) {
      return;
    }

    const store = this.getStore().getSnapshot();

    // Check if triggerRef is stale (element detached from DOM)
    if (store?.triggerRef) {
      const isConnected = (store.triggerRef as any).isConnected;

      // Also detect stale virtual iframe elements: the virtual div stays connected to
      // document.body even after the real element inside the iframe is removed, so
      // isConnected alone won't catch it. Check the actual element directly.
      const iframeInfo = store?.iframeElementInfo;
      const iframeElementGone = !!(
        iframeInfo &&
        !this.isRefindingElement &&
        (() => {
          try {
            const doc = iframeInfo.iframe.contentDocument;
            return !doc || !doc.body || !doc.body.contains(iframeInfo.element);
          } catch {
            return false;
          }
        })()
      );

      // Re-find only when the element is truly removed from the DOM.
      // A zero bounding rect alone (e.g. modal CSS-hidden) is not enough —
      // the scroll listener already hides the launcher in that case, and
      // triggering a re-find would create a new virtual element unnecessarily.
      if (!this.isRefindingElement && (iframeElementGone || !isConnected)) {
        // Set flag to prevent multiple simultaneous re-find operations
        this.isRefindingElement = true;

        // Hide immediately instead of waiting for the next monitor tick to detect isHidden
        if (store.openState) {
          this.hide();
        }

        // Stop watching for DOM removal — the element is already gone
        this.cleanupDomRemovalObserver();

        // Clear the stale triggerRef from store immediately
        this.updateStore({ triggerRef: undefined });

        // Re-check and activate auto-start conditions before re-finding
        await this.activeContentConditions();

        // Reset watcher and re-find the element
        if (this.watcher) {
          this.watcher.reset();

          // Re-register the element found handler before finding
          this.setupElementFoundHandler();

          this.watcher.findElement().catch((error) => {
            console.error('[Launcher] Error re-finding element:', error);
            // Reset flag on error
            this.isRefindingElement = false;
          });
        }
        return;
      }
    }

    const { isHidden } = await this.watcher.checkVisibility();
    const openState = store?.openState;

    // Hide launcher if it's temporarily hidden or target element is not visible
    if (this.isTemporarilyHidden() || isHidden) {
      if (openState) {
        this.hide();
      }
      return;
    }

    // Show launcher if it's not already open
    if (!openState) {
      this.open();
      await this.reportSeenEvent();
    }
  }

  /**
   * Gets the reused session ID for the launcher
   * @returns {string | null} The reused session ID or null if not applicable
   */
  getReusedSessionId() {
    return null;
  }

  /**
   * Handle additional logic after content is shown
   * @param _isNewSession - Whether this is a new session
   */
  async handleAfterShow(_isNewSession?: boolean) {
    // Launcher has no additional logic, can be empty implementation
  }

  /**
   * Builds the store data for the launcher
   * Combines default store data with content-specific data and base information
   * @returns {LauncherStore} The complete store data object
   */
  private async buildStoreData(): Promise<LauncherStore> {
    const content = this.getContent();
    const baseInfo = await this.getStoreBaseInfo();
    const { zIndex } = content.data;

    return {
      content,
      openState: false,
      ...baseInfo,
      zIndex: zIndex || baseInfo?.zIndex,
      triggerRef: undefined,
    } as LauncherStore;
  }

  /**
   * Refreshes the launcher's store data
   * Updates the store with new data while preserving the current open state and trigger reference
   */
  async refresh() {
    const { openState, triggerRef, ...storeData } = await this.buildStoreData();
    this.updateStore({ ...storeData });
  }

  /**
   * Sets up the element found event handler
   * This can be called both during initial setup and when re-finding elements
   * @private
   */
  private setupElementFoundHandler() {
    if (!this.watcher) {
      return;
    }

    // Set up element found handler
    this.watcher.once(AppEvents.ELEMENT_FOUND, async (el) => {
      // Reset the refinding flag
      this.isRefindingElement = false;
      // Check if element is in iframe
      const iframeElementInfo = this.watcher?.getIframeElementInfo();
      let triggerRef: HTMLElement = el as HTMLElement;

      if (iframeElementInfo) {
        // Check if iframe is CSS-visible before processing
        if (!iframeUtils.isIframeCSSVisible(iframeElementInfo.iframe)) {
          // Reset element watcher state so it continues searching
          if (this.watcher) {
            this.watcher.reset();
            // Re-register handler before continuing search
            this.setupElementFoundHandler();
            // Continue searching after a short delay to avoid immediate re-trigger
            setTimeout(() => {
              this.watcher?.findElement(0).catch((error) => {
                console.error('[Launcher] Error in findElement retry:', error);
              });
            }, 100);
          }
          return;
        }

        // Remove any stale virtual element before creating a new one
        const currentStore = this.getStore().getSnapshot();
        if (
          currentStore?.triggerRef &&
          (currentStore.triggerRef as any).__usertour_virtual_iframe
        ) {
          document?.body?.removeChild(currentStore.triggerRef as HTMLElement);
        }

        // For iframe elements, create a virtual element for positioning
        triggerRef = this.createVirtualElementForIframe(iframeElementInfo);

        // Set up scroll/resize listeners to keep position updated
        this.setupIframePositionUpdate(iframeElementInfo);

        // Update the virtual element position immediately — no scrolling needed.
        // The visibility monitor handles showing/hiding based on viewport position.
        this.updateIframeElementPosition(iframeElementInfo, triggerRef);
      }

      // Update store with new triggerRef
      this.updateStore({
        triggerRef,
        iframeElementInfo,
      });

      // Hide immediately on scroll/resize instead of waiting for the next monitor tick.
      this.setupScrollVisibilityListener(iframeElementInfo || null);

      // React immediately when the target element is removed from the DOM so the launcher
      // hides on the same frame, rather than waiting up to 200ms for the monitor tick.
      this.setupDomRemovalObserver(el as HTMLElement);
    });

    // Set up timeout handler
    this.watcher.once(AppEvents.ELEMENT_FOUND_TIMEOUT, () => {
      // Reset the refinding flag
      this.isRefindingElement = false;
      this.close();
    });
  }

  /**
   * Shows the launcher by initializing the element watcher and setting up event listeners
   * This method will:
   * 1. Validate the target element exists
   * 2. Clean up any existing watcher
   * 3. Initialize a new element watcher
   * 4. Set up event handlers for element found and timeout scenarios
   */
  async show() {
    const data = this.getContent().data as LauncherData;

    // Early return if document or target element is not available
    if (!document || !data.target.element) {
      return;
    }

    // Clean up existing watcher if present
    if (this.watcher) {
      this.watcher.destroy();
    }

    // Initialize store data and watcher
    const storeData = await this.buildStoreData();
    const store = { ...storeData, openState: false };
    this.setStore({ ...store });

    // Create and configure new element watcher
    this.watcher = new ElementWatcher(data.target.element);
    // Mark this watcher as being for a launcher (searches indefinitely)
    this.watcher.setIsLauncher(true);
    // Set the target missing seconds
    this.watcher.setTargetMissingSeconds(this.getTargetMissingSeconds());

    // Set up element found handler
    this.setupElementFoundHandler();

    // Start element search
    this.watcher.findElement().catch((error) => {
      console.error('[Launcher] Error in findElement:', error);
    });
  }

  /**
   * Creates a virtual element for iframe positioning
   * @private
   */
  private createVirtualElementForIframe(iframeElementInfo: IframeElementInfo): HTMLElement {
    if (!document) {
      throw new Error('Document is not available');
    }

    // Create a virtual element that represents the iframe's position
    // This is used for positioning the launcher relative to the iframe
    // Use 'fixed' position to match floating-ui's 'fixed' strategy (viewport-relative)
    const virtualElement = document.createElement('div');
    virtualElement.style.position = 'fixed';
    virtualElement.style.left = `${iframeElementInfo.iframeRect.left}px`;
    virtualElement.style.top = `${iframeElementInfo.iframeRect.top}px`;
    virtualElement.style.width = `${iframeElementInfo.iframeRect.width}px`;
    virtualElement.style.height = `${iframeElementInfo.iframeRect.height}px`;
    virtualElement.style.pointerEvents = 'none';
    virtualElement.style.visibility = 'hidden';

    // Add to DOM temporarily for positioning calculations
    document.body.appendChild(virtualElement);

    // Store reference for cleanup
    (virtualElement as any).__usertour_virtual_iframe = true;
    (virtualElement as any).__usertour_iframe_info = iframeElementInfo;

    return virtualElement;
  }

  /**
   * Handles click events on the launcher
   * @param {ContentEditorClickableElement} clickEvent - The click event data containing type and actions
   */
  async handleOnClick(clickEvent: ContentEditorClickableElement) {
    const { type, data } = clickEvent;

    if (type === 'button' && data.actions) {
      await this.handleActions(data.actions);
    }
  }

  /**
   * Processes a list of actions to be executed
   * @param {RulesCondition[]} actionRules - List of action rules to be processed
   */
  async handleActions(actionRules: RulesCondition[]) {
    // Split actions into two groups
    const pageNavigateActions = actionRules.filter(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    const otherActions = actionRules.filter(
      (action) => action.type !== ContentActionsItemType.PAGE_NAVIGATE,
    );

    // Execute non-PAGE_NAVIGATE actions first
    for (const actionRule of otherActions) {
      const { type, data } = actionRule;

      if (type === ContentActionsItemType.FLOW_START) {
        await this.startNewContent(data.contentId, data.stepCvid);
      } else if (type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(data.value);
      } else if (type === ContentActionsItemType.LAUNCHER_DISMIS) {
        this.close();
      }
    }

    // Execute PAGE_NAVIGATE actions last
    for (const actionRule of pageNavigateActions) {
      this.handleNavigate(actionRule.data);
    }
  }

  /**
   * Handles the activation of the launcher
   * This method:
   * 1. Reports the activation event
   * 2. Auto-dismisses the launcher after activation if configured
   */
  async handleActive() {
    const content = this.getContent();
    const data = content.data as LauncherData;
    const { tooltip } = data;
    await this.reportActiveEvent();
    // Auto-dismiss after activation if configured
    if (tooltip?.settings?.dismissAfterFirstActivation) {
      setTimeout(() => {
        this.close();
      }, 2000);
    }
  }

  /**
   * Initializes event listeners for launcher lifecycle events
   * Sets up handlers for activation, dismissal, and visibility events
   */
  initializeEventListeners() {}

  /**
   * Closes the launcher and triggers dismissal events
   * This method:
   * 1. Marks the launcher as dismissed
   * 2. Hides the launcher UI
   * 3. Triggers dismissal events
   */
  async close() {
    this.cleanupScrollVisibilityListener();
    this.cleanupIframePositionUpdate();
    this.cleanupDomRemovalObserver();
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
    this.setDismissed(true);
    this.setStarted(false);
    this.hide();
    await this.reportDismissEvent();
  }

  /**
   * Updates iframe element position
   * @private
   */
  private updateIframeElementPosition(
    iframeElementInfo: IframeElementInfo,
    virtualElement?: HTMLElement,
  ): void {
    // Get virtual element from parameter or store
    let elementToUpdate: HTMLElement | null = null;

    if (virtualElement) {
      elementToUpdate = virtualElement;
    } else {
      const store = this.getStore().getSnapshot();
      if (store?.triggerRef) {
        elementToUpdate = store.triggerRef as HTMLElement;
      }
    }

    if (elementToUpdate && (elementToUpdate as any).__usertour_virtual_iframe) {
      // Get the target element's position within the iframe
      const targetElement = iframeElementInfo.element;
      if (!targetElement || !targetElement.isConnected) {
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();

      // Get the current iframe position
      const iframeRect = iframeElementInfo.iframe.getBoundingClientRect();

      // Calculate the target element's position relative to the main document
      const targetLeft = iframeRect.left + targetRect.left;
      const targetTop = iframeRect.top + targetRect.top;

      // Update virtual element to match target element's position and size
      elementToUpdate.style.left = `${targetLeft}px`;
      elementToUpdate.style.top = `${targetTop}px`;
      elementToUpdate.style.width = `${targetRect.width}px`;
      elementToUpdate.style.height = `${targetRect.height}px`;

      // Update the stored iframe rect to keep it in sync
      iframeElementInfo.iframeRect = iframeRect;
    }
  }

  /**
   * Sets up scroll and resize listeners to update iframe element position
   * Similar to autoUpdate from floating-ui, but for iframe virtual elements
   * Uses continuous animation frame updates for smooth tracking during fast scrolling
   * @private
   */
  private setupIframePositionUpdate(iframeElementInfo: IframeElementInfo): void {
    // Clean up any existing listeners first
    this.cleanupIframePositionUpdate();

    // Run a continuous RAF loop so the virtual element always tracks the real element,
    // even when the page layout shifts without a scroll event (e.g. images loading,
    // dynamic content pushing the iframe down after element discovery).
    let rafId: number | null = null;
    let isRunning = false;

    const updateLoop = () => {
      if (!isRunning) {
        return;
      }

      this.updateIframeElementPosition(iframeElementInfo);
      rafId = requestAnimationFrame(updateLoop);
    };

    const startUpdateLoop = () => {
      if (!isRunning) {
        isRunning = true;
        rafId = requestAnimationFrame(updateLoop);
      }
    };

    const stopUpdateLoop = () => {
      isRunning = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    // Start the loop immediately so the position is correct from the first frame,
    // not just once a scroll event happens.
    startUpdateLoop();

    // Track scroll state for both main window and iframe
    let mainWindowScrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let iframeScrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMainWindowScroll = () => {
      // Synchronous update so floating-ui's RAF reads the current frame's position
      this.updateIframeElementPosition(iframeElementInfo);
      startUpdateLoop();

      // Clear existing timeout
      if (mainWindowScrollTimeout !== null) {
        clearTimeout(mainWindowScrollTimeout);
      }

      // Keep the loop alive while scrolling; it was already started above so this
      // just resets the idle timer without restarting the loop.
      mainWindowScrollTimeout = setTimeout(() => {
        mainWindowScrollTimeout = null;
      }, 100);
    };

    const handleIframeScroll = () => {
      // Synchronous update so floating-ui's RAF reads the current frame's position
      this.updateIframeElementPosition(iframeElementInfo);
      // Loop is already running; just reset the idle timer (no-op if already cleared)
      if (iframeScrollTimeout !== null) {
        clearTimeout(iframeScrollTimeout);
      }
      iframeScrollTimeout = setTimeout(() => {
        iframeScrollTimeout = null;
      }, 100);
    };

    const handleResize = () => {
      // Loop is always running; nothing extra needed for resize
      this.updateIframeElementPosition(iframeElementInfo);
    };

    // Set up scroll listeners on main window
    window?.addEventListener('scroll', handleMainWindowScroll, { passive: true, capture: true });
    window?.addEventListener('resize', handleResize, { passive: true });

    // Set up scroll listeners on iframe's contentWindow if accessible
    let iframeScrollHandler: (() => void) | null = null;
    let iframeResizeHandler: (() => void) | null = null;

    try {
      const iframeWindow = iframeElementInfo.iframe.contentWindow;
      const iframeDoc = iframeElementInfo.iframe.contentDocument;

      if (iframeWindow && iframeDoc) {
        iframeScrollHandler = handleIframeScroll;
        iframeResizeHandler = handleResize;

        // Listen to scroll events on iframe's window
        iframeWindow.addEventListener('scroll', iframeScrollHandler, {
          passive: true,
          capture: true,
        });
        iframeWindow.addEventListener('resize', iframeResizeHandler, { passive: true });

        // Also listen to scroll events on iframe's document body if it exists
        if (iframeDoc.body) {
          const bodyScrollHandler = handleIframeScroll;
          iframeDoc.body.addEventListener('scroll', bodyScrollHandler, {
            passive: true,
            capture: true,
          });

          // Store body scroll handler for cleanup
          (iframeElementInfo.iframe as any).__usertour_body_scroll_handler = bodyScrollHandler;
        }
      }
    } catch (_error) {
      // Cross-origin iframe, cannot access contentWindow
    }

    // Store cleanup function
    this.iframePositionUpdateCleanup = () => {
      // Stop the update loop
      stopUpdateLoop();

      // Clear scroll timeouts
      if (mainWindowScrollTimeout !== null) {
        clearTimeout(mainWindowScrollTimeout);
        mainWindowScrollTimeout = null;
      }
      if (iframeScrollTimeout !== null) {
        clearTimeout(iframeScrollTimeout);
        iframeScrollTimeout = null;
      }

      window?.removeEventListener('scroll', handleMainWindowScroll, { capture: true });
      window?.removeEventListener('resize', handleResize);

      if (iframeScrollHandler && iframeResizeHandler) {
        try {
          const iframeWindow = iframeElementInfo.iframe.contentWindow;
          const iframeDoc = iframeElementInfo.iframe.contentDocument;

          if (iframeWindow) {
            iframeWindow.removeEventListener('scroll', iframeScrollHandler, { capture: true });
            iframeWindow.removeEventListener('resize', iframeResizeHandler);
          }

          // Clean up body scroll handler if it exists
          const bodyScrollHandler = (iframeElementInfo.iframe as any)
            .__usertour_body_scroll_handler;
          if (bodyScrollHandler && iframeDoc?.body) {
            iframeDoc.body.removeEventListener('scroll', bodyScrollHandler, { capture: true });
            (iframeElementInfo.iframe as any).__usertour_body_scroll_handler = undefined;
          }
        } catch (_error) {
          // Cross-origin iframe, ignore cleanup errors
        }
      }

      this.iframePositionUpdateCleanup = null;
    };
  }

  /**
   * Cleans up iframe position update listeners
   * @private
   */
  private cleanupIframePositionUpdate(): void {
    if (this.iframePositionUpdateCleanup) {
      this.iframePositionUpdateCleanup();
      this.iframePositionUpdateCleanup = null;
    }
  }

  /**
   * Attaches scroll/resize listeners that immediately hide the launcher when
   * the target element is no longer sufficiently visible, without waiting for
   * the next 200 ms monitor tick.
   */
  private setupScrollVisibilityListener(iframeElementInfo: IframeElementInfo | null): void {
    this.cleanupScrollVisibilityListener();

    let rafId: number | null = null;

    const check = () => {
      rafId = null;
      if (!this.watcher || this.isTemporarilyHidden() || !this.hasStarted() || this.hasDismissed())
        return;

      const store = this.getStore().getSnapshot();
      if (!store) return;

      const isVisible = this.watcher.checkLauncherVisibilitySync();

      if (!isVisible && store.openState) {
        this.hide();
      } else if (isVisible && !store.openState) {
        this.open();
        this.reportSeenEvent();
      }
    };

    const scheduleCheck = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(check);
    };

    window?.addEventListener('scroll', scheduleCheck, { passive: true, capture: true });
    window?.addEventListener('resize', scheduleCheck, { passive: true });

    // Catch overlay show/hide (modals, dropdowns, sticky headers appearing) which
    // are DOM/attribute mutations rather than scroll events.
    const mutationOpts: MutationObserverInit = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    };
    const mainObserver = new MutationObserver(() => {
      const disconnected = this.watcher?.isTargetDisconnected();
      if (disconnected) {
        const store = this.getStore().getSnapshot();
        if (store?.openState) {
          this.hide();
        }
        return;
      }
      scheduleCheck();
    });
    if (typeof document !== 'undefined' && document.body)
      mainObserver.observe(document.body, mutationOpts);

    let iframeScrollHandler: (() => void) | null = null;
    let iframeObserver: MutationObserver | null = null;
    if (iframeElementInfo) {
      try {
        const iframeWindow = iframeElementInfo.iframe.contentWindow;
        if (iframeWindow) {
          iframeScrollHandler = scheduleCheck;
          iframeWindow.addEventListener('scroll', iframeScrollHandler, {
            passive: true,
            capture: true,
          });
        }
        const iframeDoc = iframeElementInfo.iframe.contentDocument;
        if (iframeDoc?.body) {
          iframeObserver = new MutationObserver(scheduleCheck);
          iframeObserver.observe(iframeDoc.body, mutationOpts);
        }
      } catch {
        // cross-origin iframe — no access
      }
    }

    this.scrollVisibilityCleanup = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window?.removeEventListener('scroll', scheduleCheck, { capture: true });
      window?.removeEventListener('resize', scheduleCheck);
      mainObserver.disconnect();
      iframeObserver?.disconnect();
      if (iframeScrollHandler && iframeElementInfo) {
        try {
          iframeElementInfo.iframe.contentWindow?.removeEventListener(
            'scroll',
            iframeScrollHandler,
            { capture: true },
          );
        } catch {
          /* cross-origin */
        }
      }
    };
  }

  private cleanupScrollVisibilityListener(): void {
    if (this.scrollVisibilityCleanup) {
      this.scrollVisibilityCleanup();
      this.scrollVisibilityCleanup = null;
    }
  }

  private setupDomRemovalObserver(element: HTMLElement): void {
    this.cleanupDomRemovalObserver();

    const parent = element.parentNode;
    if (!parent) return;

    this.domRemovalObserver = new MutationObserver(() => {
      if (!element.isConnected) {
        this.hide();
      }
    });

    this.domRemovalObserver.observe(parent, { childList: true });
  }

  private cleanupDomRemovalObserver(): void {
    if (this.domRemovalObserver) {
      this.domRemovalObserver.disconnect();
      this.domRemovalObserver = null;
    }
  }

  /**
   * Destroys the launcher instance and cleans up resources
   * This method:
   * 1. Resets the store to default state
   * 2. Destroys the element watcher if it exists
   * 3. Cleans up any remaining references
   */
  destroy() {
    // Remove virtual iframe element from document.body if present
    const store = this.getStore().getSnapshot();
    if (store?.triggerRef && (store.triggerRef as any).__usertour_virtual_iframe) {
      document?.body?.removeChild(store.triggerRef as HTMLElement);
    }

    // Reset store to default state
    this.setStore(undefined);

    // Clean up element watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }

    this.isRefindingElement = false;
    this.cleanupScrollVisibilityListener();
    this.cleanupIframePositionUpdate();
    this.cleanupDomRemovalObserver();
  }

  reset() {}

  /**
   * Builds event data object with launcher information
   * @returns {Record<string, string | number>} Object containing launcher metadata
   */
  private getEventData(): Record<string, string | number> {
    const content = this.getContent();

    return {
      [EventAttributes.LAUNCHER_ID]: content.contentId,
      [EventAttributes.LAUNCHER_NAME]: content.name,
      [EventAttributes.LAUNCHER_VERSION_ID]: content.id,
      [EventAttributes.LAUNCHER_VERSION_NUMBER]: content.sequence,
    };
  }

  /**
   * Reports when the launcher becomes visible to the user
   * Creates a new session for tracking
   */
  private async reportSeenEvent() {
    await this.reportEventWithSession({
      eventName: BizEvents.LAUNCHER_SEEN,
      eventData: this.getEventData(),
    });
  }

  /**
   * Reports when the launcher is dismissed by the user
   * Deletes the current tracking session
   */
  private async reportDismissEvent() {
    await this.reportEventWithSession({
      eventName: BizEvents.LAUNCHER_DISMISSED,
      eventData: this.getEventData(),
    });
  }

  /**
   * Reports when the launcher is activated by the user
   * Deletes the current tracking session after activation
   */
  private async reportActiveEvent() {
    await this.reportEventWithSession({
      eventName: BizEvents.LAUNCHER_ACTIVATED,
      eventData: this.getEventData(),
    });
  }
}
