import { ContentEditorClickableElement } from '@usertour-packages/shared-editor';
import { BizEvents, EventAttributes, LauncherData } from '@usertour/types';
import { ContentActionsItemType, RulesCondition } from '@usertour/types';
import { evalCode } from '@usertour/helpers';
import { LauncherStore } from '../types/store';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { BaseContent } from './base-content';
import { ElementWatcher } from './element-watcher';
import { iframeUtils, IframeElementInfo } from '../utils/iframe-utils';

export class Launcher extends BaseContent<LauncherStore> {
  private watcher: ElementWatcher | null = null;
  private iframePositionUpdateCleanup: (() => void) | null = null; // Cleanup function for iframe position update listeners
  private isRefindingElement = false; // Flag to prevent multiple simultaneous re-find operations

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
      const boundingRect = (store.triggerRef as any).getBoundingClientRect?.();

      // If element is detached or has zero dimensions, re-find it
      if (!this.isRefindingElement && (!isConnected || (boundingRect && boundingRect.top === 0 && boundingRect.left === 0 && boundingRect.width === 0 && boundingRect.height === 0))) {
        // Set flag to prevent multiple simultaneous re-find operations
        this.isRefindingElement = true;

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

        // For iframe elements, create a virtual element for positioning
        triggerRef = this.createVirtualElementForIframe(iframeElementInfo);

        // Set up scroll/resize listeners to keep position updated
        this.setupIframePositionUpdate(iframeElementInfo);

        // Scroll iframe and element into view
        const { smoothScroll } = await import('@usertour-packages/dom');
        // First scroll the iframe itself into view on the main page
        await smoothScroll(iframeElementInfo.iframe, { block: 'center' });

        // Then scroll the element inside the iframe into view and wait for it to complete
        try {
          const targetElement = iframeElementInfo.element;
          if (targetElement && targetElement.isConnected) {
            await this.waitForIframeElementScroll(targetElement, iframeElementInfo, {
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });

            // Update the virtual element position after scrolling completes
            // The element's position relative to the iframe has changed, so we need to recalculate
            // Pass the virtual element directly since store hasn't been updated yet
            this.updateIframeElementPosition(iframeElementInfo, triggerRef);

            // Small delay to ensure position update is processed by the browser
            await new Promise(resolve => requestAnimationFrame(resolve));
          }
        } catch (error) {
          // Element might be in cross-origin iframe, which is fine - we already scrolled the iframe
        }
      } else {
        // For main document elements, we already checked visibility in findVisibleElementBySelector
        // so we can trust that the element is visible and proceed with attachment
        // No need to check again here as it could cause false negatives due to timing

        // For main page elements, scroll into view and wait
        const { smoothScroll } = await import('@usertour-packages/dom');
        await smoothScroll(el as Element, { block: 'center' });
      }

      // Update store with new triggerRef
      this.updateStore({
        triggerRef,
        iframeElementInfo,
      });
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
    // Clean up position update listeners
    this.cleanupIframePositionUpdate();
    
    this.setDismissed(true);
    this.setStarted(false);
    this.hide();
    await this.reportDismissEvent();
  }

  /**
   * Waits for element scroll inside iframe to complete
   * Similar to smoothScroll but works for elements inside iframes
   * @private
   */
  private async waitForIframeElementScroll(element: Element, iframeElementInfo?: IframeElementInfo, options: ScrollIntoViewOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      if (!element || !element.isConnected) {
        resolve();
        return;
      }

      const scrollOptions = {
        behavior: 'smooth' as ScrollBehavior,
        block: 'center' as ScrollLogicalPosition,
        inline: 'nearest' as ScrollLogicalPosition,
        ...options,
      };

      // Get iframe's window and document for scroll position checking
      let iframeWindow: Window | null = null;
      let iframeDoc: Document | null = null;
      
      if (iframeElementInfo) {
        try {
          iframeWindow = iframeElementInfo.iframe.contentWindow;
          iframeDoc = iframeElementInfo.iframe.contentDocument;
        } catch (error) {
          // Cross-origin iframe, cannot access contentWindow
        }
      }

      let same = 0;
      let lastScrollTop: number | null = null;
      let lastScrollLeft: number | null = null;
      let rafId: number;

      const timeoutId = setTimeout(() => {
        cancelAnimationFrame(rafId);
        resolve();
      }, 2000); // 2 second timeout to allow for smooth scrolling

      // Start scrolling
      element.scrollIntoView(scrollOptions);
      rafId = requestAnimationFrame(check);

      function check() {
        // For iframe elements, check scroll position instead of element position
        // because getBoundingClientRect is relative to iframe viewport
        if (iframeWindow && iframeDoc) {
          const scrollTop = iframeWindow.pageYOffset || iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop || 0;
          const scrollLeft = iframeWindow.pageXOffset || iframeDoc.documentElement.scrollLeft || iframeDoc.body.scrollLeft || 0;

          // Check if scroll position has stabilized
          if (scrollTop === lastScrollTop && scrollLeft === lastScrollLeft) {
            if (same++ > 2) {
              clearTimeout(timeoutId);
              resolve();
              return;
            }
          } else {
            same = 0;
            lastScrollTop = scrollTop;
            lastScrollLeft = scrollLeft;
          }
        } else {
          // Fallback: check element position relative to iframe viewport
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top;
          
          if (elementTop === lastScrollTop) {
            if (same++ > 5) {
              clearTimeout(timeoutId);
              resolve();
              return;
            }
          } else {
            same = 0;
            lastScrollTop = elementTop;
          }
        }

        rafId = requestAnimationFrame(check);
      }
    });
  }

  /**
   * Updates iframe element position
   * @private
   */
  private updateIframeElementPosition(iframeElementInfo: IframeElementInfo, virtualElement?: HTMLElement): void {
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
    
    // Use continuous animation frame updates for smooth tracking
    // This is similar to floating-ui's autoUpdate with animationFrame: true
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
    
    // Track scroll state for both main window and iframe
    // Keep the loop running as long as either is scrolling
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

      // Stop main window scroll tracking after scrolling stops (100ms of no scroll events)
      mainWindowScrollTimeout = setTimeout(() => {
        mainWindowScrollTimeout = null;
        // Only stop loop if iframe is also not scrolling
        if (iframeScrollTimeout === null) {
          stopUpdateLoop();
        }
      }, 100);
    };
    
    const handleIframeScroll = () => {
      // Synchronous update so floating-ui's RAF reads the current frame's position
      this.updateIframeElementPosition(iframeElementInfo);
      startUpdateLoop();

      // Clear existing timeout
      if (iframeScrollTimeout !== null) {
        clearTimeout(iframeScrollTimeout);
      }

      // Stop iframe scroll tracking after scrolling stops (100ms of no scroll events)
      iframeScrollTimeout = setTimeout(() => {
        iframeScrollTimeout = null;
        // Only stop loop if main window is also not scrolling
        if (mainWindowScrollTimeout === null) {
          stopUpdateLoop();
        }
      }, 100);
    };
    
    const handleResize = () => {
      startUpdateLoop();
      // Resize typically happens once, so we can stop after a brief delay
      setTimeout(() => {
        stopUpdateLoop();
      }, 200);
    };
    
    // Set up scroll listeners on main window
    window.addEventListener('scroll', handleMainWindowScroll, { passive: true, capture: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
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
        iframeWindow.addEventListener('scroll', iframeScrollHandler, { passive: true, capture: true });
        iframeWindow.addEventListener('resize', iframeResizeHandler, { passive: true });
        
        // Also listen to scroll events on iframe's document body if it exists
        if (iframeDoc.body) {
          const bodyScrollHandler = handleIframeScroll;
          iframeDoc.body.addEventListener('scroll', bodyScrollHandler, { passive: true, capture: true });
          
          // Store body scroll handler for cleanup
          (iframeElementInfo.iframe as any).__usertour_body_scroll_handler = bodyScrollHandler;
        }
        
      }
    } catch (error) {
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
      
      window.removeEventListener('scroll', handleMainWindowScroll, { capture: true });
      window.removeEventListener('resize', handleResize);
      
      if (iframeScrollHandler && iframeResizeHandler) {
        try {
          const iframeWindow = iframeElementInfo.iframe.contentWindow;
          const iframeDoc = iframeElementInfo.iframe.contentDocument;
          
          if (iframeWindow) {
            iframeWindow.removeEventListener('scroll', iframeScrollHandler, { capture: true });
            iframeWindow.removeEventListener('resize', iframeResizeHandler);
          }
          
          // Clean up body scroll handler if it exists
          const bodyScrollHandler = (iframeElementInfo.iframe as any).__usertour_body_scroll_handler;
          if (bodyScrollHandler && iframeDoc?.body) {
            iframeDoc.body.removeEventListener('scroll', bodyScrollHandler, { capture: true });
            delete (iframeElementInfo.iframe as any).__usertour_body_scroll_handler;
          }
        } catch (error) {
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
   * Destroys the launcher instance and cleans up resources
   * This method:
   * 1. Resets the store to default state
   * 2. Destroys the element watcher if it exists
   * 3. Cleans up any remaining references
   */
  destroy() {
    // Reset store to default state
    this.setStore(undefined);

    // Clean up element watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }

    // Reset flags
    this.isRefindingElement = false;

    // Clean up position update listeners
    this.cleanupIframePositionUpdate();
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
