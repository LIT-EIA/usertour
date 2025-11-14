import { smoothScroll } from '@usertour-packages/dom';
import { finderV2 } from '@usertour-packages/finder';
import {
  ContentEditorClickableElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  isQuestionElement,
} from '@usertour-packages/shared-editor';
import {
  BizEvents,
  ContentActionsItemType,
  EventAttributes,
  RulesCondition,
  SDKContent,
  Step,
  StepContentType,
  StepTrigger,
  contentEndReason,
} from '@usertour/types';
import { evalCode } from '@usertour/helpers';
import { TourStore } from '../types/store';
import { activedRulesConditions, flowIsDismissed, isActive } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { BaseContent } from './base-content';
import { ElementWatcher } from './element-watcher';
import { logger } from '../utils/logger';
import { getStepByCvid } from '../utils/content-utils';
import { iframeUtils, IframeElementInfo } from '../utils/iframe-utils';

export class Tour extends BaseContent<TourStore> {
  private watcher: ElementWatcher | null = null;
  private triggerTimeouts: NodeJS.Timeout[] = []; // Store timeout IDs
  private flowCompletedReported = false; // Track if FLOW_COMPLETED has been reported
  private isUpdatingStore = false; // Prevent infinite loops
  private isProcessingElementFound = false; // Prevent duplicate element found processing
  private isNavigatingToStep = false; // Track if we're navigating to a step via STEP_GOTO
  private iframePositionUpdateCleanup: (() => void) | null = null; // Cleanup function for iframe position update listeners

  /**
   * Monitors and updates the tour state
   * This method handles:
   * 1. Checking step visibility for active tours
   * 2. Activating trigger conditions
   * 3. Activating content conditions
   *
   * @returns {Promise<void>}
   */
  async monitor(): Promise<void> {
    try {
      // Always activate content conditions
      await this.activeContentConditions();

      // Handle active tour monitoring
      if (this.isActiveTour()) {
        // Check if the current step is visible
        await this.checkStepVisible();
        // Activate any trigger conditions
        await this.activeTriggerConditions();
        // Check and update theme settings if needed
        await this.checkAndUpdateThemeSettings();
      }
    } catch (error) {
      logger.error('Error in tour monitoring:', error);
      // Optionally handle the error or rethrow
      throw error;
    }
  }

  /**
   * Shows a specific step in the tour by its cvid, or the first step if no cvid is provided
   * @param cvid - Optional cvid of the step to show. If not provided, shows the first step
   * @returns Promise that resolves when the step is shown, or rejects if the tour cannot be shown
   */
  async show(cvid?: string): Promise<void> {
    const content = this.getContent();

    // Validate content is valid
    if (!this.isValidTour(content)) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    const steps = content.steps ?? [];
    // Find the target step
    const step = cvid ? getStepByCvid(steps, cvid) : steps[0];

    // If no valid step found, close the tour
    if (!step?.cvid) {
      await this.close(contentEndReason.STEP_NOT_FOUND);
      return;
    }

    // Reset tour state and set new step
    console.log('[Tour] === STARTING TOUR ===');
    console.log('[Tour] Step:', step.cvid);
    console.log('[Tour] Resetting tour state...');
    this.reset();
    this.setCurrentStep(step);

    // Display step based on its type
    await this.displayStep(step);
  }

  /**
   * Refreshes the current step with the latest content data
   * This method updates the current step with any changes from the content definition
   * while preserving the current trigger state
   * @returns void
   */
  async refresh(): Promise<void> {
    const content = this.getContent();
    const currentStep = this.getCurrentStep();

    // Early return if no current step or content steps
    if (!currentStep?.cvid || !content.steps?.length) {
      return;
    }

    // Find the updated step definition
    const updatedStep = content.steps.find((step) => step.cvid === currentStep.cvid);
    if (!updatedStep) {
      return;
    }

    // Preserve current trigger state while updating other properties
    const { trigger, ...rest } = updatedStep;
    const preservedStep = {
      ...rest,
      trigger: trigger?.filter((t) =>
        currentStep.trigger?.some((currentTrigger) => currentTrigger.id === t.id),
      ),
    };

    // Update the current step
    this.setCurrentStep(preservedStep);

    // Update store with new data
    const { openState, triggerRef, progress, ...storeData } = await this.buildStoreData();
    this.updateStore({
      ...storeData,
      currentStep: preservedStep,
    });
  }

  /**
   * Gets the ID of the latest session that can be reused
   * A session can be reused if:
   * 1. The content has data and a latest session
   * 2. The flow has not been dismissed
   *
   * @returns {string | null} The session ID if it can be reused, null otherwise
   */
  getReusedSessionId(): string | null {
    const content = this.getContent();

    // Check if content has required data
    if (!content.data || !content.latestSession) {
      return null;
    }

    // Check if flow has been dismissed
    if (flowIsDismissed(content.latestSession)) {
      return null;
    }

    return content.latestSession.id;
  }

  /**
   * Ends the latest session
   */
  async endLatestSession(reason: contentEndReason) {
    const eventData: Record<string, any> = {
      [EventAttributes.FLOW_END_REASON]: reason,
      [EventAttributes.FLOW_VERSION_ID]: this.getContent().id,
      [EventAttributes.FLOW_VERSION_NUMBER]: this.getContent().sequence,
    };
    const sessionId = this.getReusedSessionId();
    if (!sessionId) {
      return;
    }

    await this.reportEventWithSession({
      sessionId,
      eventName: BizEvents.FLOW_ENDED,
      eventData,
    });

    // Remove the latest session from the content
    this.removeContentLatestSession();
  }

  /**
   * Builds the store data for the tour
   * This method combines the base store info with the current step data
   * and sets default values for required fields
   *
   * @returns {TourStore} The complete store data object
   */
  private async buildStoreData(): Promise<TourStore> {
    // Get base store information
    const baseInfo = await this.getStoreBaseInfo();
    const currentStep = this.getCurrentStep();
    const zIndex = this.getBaseZIndex();

    // Combine all store data with proper defaults
    return {
      triggerRef: null, // Reset trigger reference
      ...baseInfo, // Add base information
      currentStep, // Add current step
      openState: true, // Set initial open state
      zIndex: zIndex + 200,
    } as TourStore;
  }

  /**
   * Validates if the tour is valid
   * @param content - The content to validate
   * @returns {boolean} True if the tour is valid, false otherwise
   */
  private isValidTour(content: SDKContent): boolean {
    const userInfo = this.getUserInfo();
    return Boolean(content.steps?.length && userInfo?.externalId);
  }

  /**
   * Displays a step based on its type
   * @private
   */
  private async displayStep(step: Step): Promise<void> {
    if (step.type === StepContentType.TOOLTIP) {
      await this.showPopper(step);
    } else if (step.type === StepContentType.MODAL) {
      await this.showModal(step);
    } else if (step.type === StepContentType.HIDDEN) {
      await this.showHidden(step);
    } else {
      this.close(contentEndReason.SYSTEM_CLOSED);
    }
  }

  /**
   * Displays a tooltip step in the tour
   * This method handles:
   * 1. Validating the step and its target
   * 2. Setting up the element watcher
   * 3. Handling element found and timeout events
   * 4. Updating the store with the new state
   *
   * @param currentStep - The step to display as a tooltip
   * @throws Will close the tour if validation fails or target is missing
   */
  async showPopper(currentStep: Step): Promise<void> {
    // Validate step and target
    if (!this.isValidPopperStep(currentStep)) {
      await this.close(contentEndReason.SYSTEM_CLOSED);
      return;
    }

    // Report step seen event
    await this.reportStepEvents(currentStep, BizEvents.FLOW_STEP_SEEN);

    // Activate trigger conditions
    await this.activeTriggerConditions();

    // Set up element watcher
    // NOTE: We do NOT report flow completion here, even if it's the last step,
    // because we need to wait until the element is actually found.
    // Completion will be reported in handleElementFound() after the element is successfully located.
    const store = await this.buildStoreData();
    this.setupElementWatcher(currentStep, store);
  }

  /**
   * Validates if a step can be displayed as a popper
   * @private
   */
  private isValidPopperStep(step: Step): boolean {
    return Boolean(step?.target && step.cvid === this.getCurrentStep()?.cvid && document);
  }

  /**
   * Sets up the element watcher for a popper step
   * @private
   */
  private setupElementWatcher(step: Step, store: TourStore): void {
    console.log('[Tour] Setting up element watcher for step:', step.cvid, 'Target:', step.target);
    
    // Clean up existing watcher and iframe listeners
    if (this.watcher) {
      // Get the current step's iframe info before destroying the watcher
      const currentIframeInfo = this.watcher.getIframeElementInfo();
      if (currentIframeInfo) {
        const currentStepId = this.getCurrentStep()?.cvid;
        if (currentStepId) {
          iframeUtils.sendCleanupMessageToIframe(currentIframeInfo.iframe, currentStepId);
        }
      }
      
      // Clean up position update listeners
      this.cleanupIframePositionUpdate();
      
      this.watcher.destroy();
      this.watcher = null;
    }

    // Create new watcher
    if (!step.target) {
      console.log('[Tour] No target for step, closing tour');
      this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
      return;
    }
    this.watcher = new ElementWatcher(step.target);
    this.watcher.setTargetMissingSeconds(this.getTargetMissingSeconds());

    // Handle element found
    this.watcher.once(AppEvents.ELEMENT_FOUND, async (el: any) => {
      console.log('[Tour] ElementWatcher found element:', el);
      console.log('[Tour] Element type check:', el instanceof Element);
      console.log('[Tour] Element nodeType:', el?.nodeType);
      console.log('[Tour] Element tagName:', el?.tagName);
      console.log('[Tour] Step:', step.cvid);
      console.log('[Tour] Store:', store);
      
      // Check if element is a DOM element (works for both main document and iframe elements)
      if (el && typeof el === 'object' && el.nodeType === Node.ELEMENT_NODE) {
        console.log('[Tour] Element is valid DOM element, calling handleElementFound...');
        await this.handleElementFound(el as Element, step, store);
      } else {
        console.log('[Tour] Element is not a valid DOM element, skipping handleElementFound');
      }
    });

    // Handle element not found
    this.watcher.once(AppEvents.ELEMENT_FOUND_TIMEOUT, async () => {
      console.log('[Tour] ElementWatcher timeout for step:', step.cvid);
      await this.handleElementNotFound(step);
    });

    // Handle element changed - DISABLED to prevent infinite loops
    // this.watcher.on(AppEvents.ELEMENT_CHANGED, (el: any) => {
    //   console.log('[Tour] ElementWatcher element changed:', el);
    //   if (el && typeof el === 'object' && el.nodeType === Node.ELEMENT_NODE) {
    //     this.handleElementChanged(el as Element, step, store);
    //   }
    // });
    // Start watching
    console.log('[Tour] Starting element watcher...');
    this.watcher.findElement().catch((error) => {
      console.error('[Tour] Error in findElement:', error);
    });
  }

  /**
   * Handles when the target element is found
   * @private
   */
  private async handleElementFound(el: Element, step: Step, store: TourStore): Promise<void> {
    // Prevent duplicate processing
    if (this.isProcessingElementFound) {
      console.log('[Tour] Already processing element found, skipping');
      return;
    }
    this.isProcessingElementFound = true;
    
    console.log('[Tour] === handleElementFound CALLED ===');
    console.log('[Tour] Element found for step:', step.cvid, 'Element:', el);
    console.log('[Tour] Current step check - isActiveTour:', this.isActiveTour());
    console.log('[Tour] Current step check - getCurrentStep:', this.getCurrentStep()?.cvid);
    const openState = !this.isTemporarilyHidden();
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      console.log('[Tour] Step mismatch, ignoring element found event');
      console.log('[Tour] Expected step:', step.cvid, 'Current step:', currentStep?.cvid);
      this.isProcessingElementFound = false;
      return;
    }
    const { progress, index, total } = this.getCurrentStepInfo(step);

    // Check if element is in iframe
    const iframeElementInfo = this.watcher?.getIframeElementInfo();
    let triggerRef: Element = el;

    if (iframeElementInfo) {
      // Check if iframe is CSS-visible before processing
      if (!iframeUtils.isIframeCSSVisible(iframeElementInfo.iframe)) {
        console.log('[Tour] Iframe is not CSS-visible, skipping element processing');
        this.isProcessingElementFound = false;
        // Reset element watcher state so it continues searching
        // The element watcher has already found the element, but we need to reset it
        // so it can continue searching for a visible iframe
        if (this.watcher) {
          this.watcher.reset();
          // Continue searching after a short delay to avoid immediate re-trigger
          setTimeout(() => {
            this.watcher?.findElement(0).catch((error) => {
              console.error('[Tour] Error in findElement retry:', error);
            });
          }, 100);
        }
        return;
      }
      
      // For iframe elements, we need to create a virtual element that represents
      // the target element's position for positioning purposes
      triggerRef = this.createVirtualElementForIframe(iframeElementInfo);
      
      // Set up iframe communication for step progression
      this.setupIframeCommunication(step, iframeElementInfo);
      
      // IMPORTANT: Don't set up position updates yet - wait until after scrolling completes
      // This prevents conflicts when navigating between different iframes
    } else {
      // For main document elements, we already checked visibility in findVisibleElementBySelector
      // so we can trust that the element is visible and proceed with attachment
      // No need to check again here as it could cause false negatives due to timing
    }

    // Scroll element into view if tour is visible
    if (openState) {
      if (iframeElementInfo) {
        console.log('[Tour] === STARTING IFRAME SCROLLING PROCESS ===');
        console.log('[Tour] Step ID:', step.cvid);
        console.log('[Tour] Initial iframe position:', {
          iframeRect: iframeElementInfo.iframeRect,
          mainWindowScroll: { top: window.scrollY, left: window.scrollX },
          viewportSize: { width: window.innerWidth, height: window.innerHeight }
        });
        
        // Get initial element position
        const initialElementRect = iframeElementInfo.element.getBoundingClientRect();
        console.log('[Tour] Initial element position within iframe:', {
          elementRect: initialElementRect,
          calculatedPosition: {
            left: iframeElementInfo.iframeRect.left + initialElementRect.left,
            top: iframeElementInfo.iframeRect.top + initialElementRect.top
          }
        });
        
        // First scroll the iframe itself into view on the main page
        // But only if it's not already fully visible
        const iframeRect = iframeElementInfo.iframe.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        
        // Check if iframe is fully visible in viewport
        const isFullyVisible = (
          iframeRect.top >= 0 &&
          iframeRect.left >= 0 &&
          iframeRect.bottom <= viewport.height &&
          iframeRect.right <= viewport.width
        );
        
        // Calculate element position relative to iframe
        const elementRect = iframeElementInfo.element.getBoundingClientRect();
        const elementTopRelativeToIframe = elementRect.top - iframeRect.top;
        const iframeMiddle = iframeRect.height / 2;
        const isElementAboveIframeMiddle = elementTopRelativeToIframe < iframeMiddle;
        
        // Calculate element's absolute position in the main document
        const elementAbsoluteTop = iframeRect.top + elementTopRelativeToIframe;
        const elementAbsoluteLeft = iframeRect.left + (elementRect.left - iframeRect.left);
        
        console.log('[Tour] [SCROLL-1] Element position check:', {
          elementTopRelativeToIframe,
          iframeMiddle,
          isElementAboveIframeMiddle,
          iframeHeight: iframeRect.height,
          elementAbsoluteTop,
          elementAbsoluteLeft,
          currentScrollY: window.scrollY
        });
        
        if (isElementAboveIframeMiddle) {
          // If element is above iframe middle, scroll directly to the element's position
          // Calculate scroll target: element position - half viewport height (to center element in viewport)
          const targetScrollY = window.scrollY + elementAbsoluteTop - (viewport.height / 2);
          
          console.log('[Tour] [SCROLL-1] Element is above iframe middle, scrolling directly to element position...');
          console.log('[Tour] [SCROLL-1] Target scroll position:', {
            targetScrollY,
            elementAbsoluteTop,
            viewportHeight: viewport.height,
            currentScrollY: window.scrollY
          });
          
          const scrollStartTime = Date.now();
          
          // Scroll to the calculated position
          window.scrollTo({
            top: targetScrollY,
            left: window.scrollX,
            behavior: 'smooth'
          });
          
          // Wait for smooth scroll to complete
          await new Promise<void>((resolve) => {
            let lastScrollY = window.scrollY;
            let sameCount = 0;
            const checkScroll = () => {
              const currentScrollY = window.scrollY;
              if (Math.abs(currentScrollY - lastScrollY) < 1) {
                sameCount++;
                if (sameCount > 5) {
                  resolve();
                  return;
                }
              } else {
                sameCount = 0;
                lastScrollY = currentScrollY;
              }
              requestAnimationFrame(checkScroll);
            };
            requestAnimationFrame(checkScroll);
            
            // Timeout after 1 second
            setTimeout(() => resolve(), 1000);
          });
          
          const scrollDuration = Date.now() - scrollStartTime;
          console.log('[Tour] [SCROLL-1] Direct scroll to element completed in', scrollDuration, 'ms');
          console.log('[Tour] [SCROLL-1] Final scroll position:', {
            top: window.scrollY,
            left: window.scrollX
          });
          
          // Wait a moment for scroll to settle
          console.log('[Tour] [SCROLL-1] Waiting for scroll to settle...');
          await new Promise(resolve => requestAnimationFrame(resolve));
        } else if (!isFullyVisible) {
          // If iframe is not fully visible and element is not above middle, scroll iframe to center
          console.log('[Tour] [SCROLL-1] Iframe not fully visible, scrolling iframe into view on main page (block: center)...');
          const iframeScrollStartTime = Date.now();
          await smoothScroll(iframeElementInfo.iframe, { block: 'center' });
          const iframeScrollDuration = Date.now() - iframeScrollStartTime;
          console.log('[Tour] [SCROLL-1] Iframe scroll completed in', iframeScrollDuration, 'ms');
          console.log('[Tour] [SCROLL-1] Main window scroll after iframe scroll:', {
            top: window.scrollY,
            left: window.scrollX
          });
          
          // Wait a moment for the iframe scroll to settle
          console.log('[Tour] [SCROLL-1] Waiting for iframe scroll to settle...');
          await new Promise(resolve => requestAnimationFrame(resolve));
        } else {
          console.log('[Tour] [SCROLL-1] Iframe is already fully visible, skipping iframe scroll');
        }
        
        // IMPORTANT: Recalculate iframeRect after scrolling, as the iframe's position has changed
        // This ensures the virtual element uses the correct iframe position
        const oldIframeRect = { ...iframeElementInfo.iframeRect };
        iframeElementInfo.iframeRect = iframeElementInfo.iframe.getBoundingClientRect();
        console.log('[Tour] [SCROLL-1] Recalculated iframeRect after scroll:', {
          old: oldIframeRect,
          new: iframeElementInfo.iframeRect,
          difference: {
            left: iframeElementInfo.iframeRect.left - oldIframeRect.left,
            top: iframeElementInfo.iframeRect.top - oldIframeRect.top
          }
        });
        
        // Recreate the virtual element with the updated iframe position
        // The previous triggerRef was created with old iframe position, so recreate it
        const oldVirtualElement = triggerRef;
        const oldVirtualRect = oldVirtualElement instanceof HTMLElement ? {
          left: oldVirtualElement.style.left,
          top: oldVirtualElement.style.top,
          width: oldVirtualElement.style.width,
          height: oldVirtualElement.style.height
        } : null;
        console.log('[Tour] [SCROLL-1] Old virtual element position:', oldVirtualRect);
        
        triggerRef = this.createVirtualElementForIframe(iframeElementInfo);
        const newVirtualRect = triggerRef instanceof HTMLElement ? {
          left: triggerRef.style.left,
          top: triggerRef.style.top,
          width: triggerRef.style.width,
          height: triggerRef.style.height
        } : null;
        console.log('[Tour] [SCROLL-1] New virtual element position:', newVirtualRect);
        console.log('[Tour] [SCROLL-1] Virtual element position change:', oldVirtualRect && newVirtualRect ? {
          leftDiff: parseFloat(newVirtualRect.left) - parseFloat(oldVirtualRect.left),
          topDiff: parseFloat(newVirtualRect.top) - parseFloat(oldVirtualRect.top)
        } : 'N/A');
        
        // Clean up old virtual element if it exists
        if (oldVirtualElement && (oldVirtualElement as any).__usertour_virtual_iframe) {
          try {
            oldVirtualElement.remove();
            console.log('[Tour] [SCROLL-1] Removed old virtual element');
          } catch (error) {
            console.log('[Tour] [SCROLL-1] Error removing old virtual element:', error);
          }
        }
        
        // Then scroll the element inside the iframe into view and wait for it to complete
        try {
          const targetElement = iframeElementInfo.element;
          if (targetElement && targetElement.isConnected) {
            // Get element position before scrolling inside iframe
            const beforeScrollElementRect = targetElement.getBoundingClientRect();
            let iframeScrollTop: number | null = null;
            let iframeScrollLeft: number | null = null;
            
            try {
              const iframeWindow = iframeElementInfo.iframe.contentWindow;
              const iframeDoc = iframeElementInfo.iframe.contentDocument;
              if (iframeWindow && iframeDoc) {
                iframeScrollTop = iframeWindow.pageYOffset || iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop || 0;
                iframeScrollLeft = iframeWindow.pageXOffset || iframeDoc.documentElement.scrollLeft || iframeDoc.body.scrollLeft || 0;
              }
            } catch (error) {
              // Cannot access iframe scroll position (cross-origin)
            }
            
            console.log('[Tour] [SCROLL-2] Scrolling element inside iframe into view...');
            console.log('[Tour] [SCROLL-2] Element position before scroll:', beforeScrollElementRect);
            console.log('[Tour] [SCROLL-2] Iframe scroll position before scroll:', {
              top: iframeScrollTop,
              left: iframeScrollLeft
            });
            
            const elementScrollStartTime = Date.now();
            await this.waitForIframeElementScroll(targetElement, iframeElementInfo, {
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
            const elementScrollDuration = Date.now() - elementScrollStartTime;
            console.log('[Tour] [SCROLL-2] Element scroll inside iframe completed in', elementScrollDuration, 'ms');
            
            // Get element position after scrolling
            const afterScrollElementRect = targetElement.getBoundingClientRect();
            let iframeScrollTopAfter: number | null = null;
            let iframeScrollLeftAfter: number | null = null;
            
            try {
              const iframeWindow = iframeElementInfo.iframe.contentWindow;
              const iframeDoc = iframeElementInfo.iframe.contentDocument;
              if (iframeWindow && iframeDoc) {
                iframeScrollTopAfter = iframeWindow.pageYOffset || iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop || 0;
                iframeScrollLeftAfter = iframeWindow.pageXOffset || iframeDoc.documentElement.scrollLeft || iframeDoc.body.scrollLeft || 0;
              }
            } catch (error) {
              // Ignore cross-origin errors
            }
            
            console.log('[Tour] [SCROLL-2] Element position after scroll:', afterScrollElementRect);
            console.log('[Tour] [SCROLL-2] Iframe scroll position after scroll:', {
              top: iframeScrollTopAfter,
              left: iframeScrollLeftAfter
            });
            console.log('[Tour] [SCROLL-2] Scroll change:', {
              elementPositionChange: {
                top: afterScrollElementRect.top - beforeScrollElementRect.top,
                left: afterScrollElementRect.left - beforeScrollElementRect.left
              },
              iframeScrollChange: iframeScrollTop !== null && iframeScrollTopAfter !== null ? {
                top: iframeScrollTopAfter - iframeScrollTop,
                left: iframeScrollLeftAfter! - iframeScrollLeft!
              } : null
            });
            
            // Wait for scroll to fully settle before updating position
            console.log('[Tour] [SCROLL-2] Waiting for scroll to fully settle (2 animation frames)...');
            await new Promise(resolve => {
              // Wait for two animation frames to ensure scroll has settled
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  console.log('[Tour] [SCROLL-2] Scroll settlement wait completed');
                  resolve(undefined);
                });
              });
            });
            
            // Get final positions before updating
            const finalElementRect = targetElement.getBoundingClientRect();
            const finalIframeRect = iframeElementInfo.iframe.getBoundingClientRect();
            console.log('[Tour] [UPDATE] Final positions before position update:', {
              elementRect: finalElementRect,
              iframeRect: finalIframeRect,
              calculatedVirtualPosition: {
                left: finalIframeRect.left + finalElementRect.left,
                top: finalIframeRect.top + finalElementRect.top
              },
              currentVirtualElementPosition: triggerRef instanceof HTMLElement ? {
                left: triggerRef.style.left,
                top: triggerRef.style.top
              } : null
            });
            
            // Update the virtual element position after scrolling completes
            // The element's position relative to the iframe has changed, so we need to recalculate
            // Pass the virtual element directly since store hasn't been updated yet
            console.log('[Tour] [UPDATE] Updating virtual element position...');
            this.updateIframeElementPosition(iframeElementInfo, triggerRef as HTMLElement);
            
            const updatedVirtualRect = triggerRef instanceof HTMLElement ? {
              left: triggerRef.style.left,
              top: triggerRef.style.top,
              width: triggerRef.style.width,
              height: triggerRef.style.height
            } : null;
            console.log('[Tour] [UPDATE] Virtual element position after update:', updatedVirtualRect);
            console.log('[Tour] [UPDATE] Position update change:', newVirtualRect && updatedVirtualRect ? {
              leftDiff: parseFloat(updatedVirtualRect.left) - parseFloat(newVirtualRect.left),
              topDiff: parseFloat(updatedVirtualRect.top) - parseFloat(newVirtualRect.top)
            } : 'N/A');
            
            // Now set up scroll/resize listeners to keep position updated
            // Do this AFTER scrolling completes to prevent conflicts
            console.log('[Tour] [SETUP] Setting up iframe position update listeners...');
            this.setupIframePositionUpdate(iframeElementInfo);
            console.log('[Tour] === IFRAME SCROLLING PROCESS COMPLETED ===');
          }
        } catch (error) {
          // Element might be in cross-origin iframe, which is fine - we already scrolled the iframe
          // Still set up position updates even if scrolling failed
          this.setupIframePositionUpdate(iframeElementInfo);
        }
      } else {
        await smoothScroll(el, { block: 'center' });
      }
    } else if (iframeElementInfo) {
      // If tour is not visible but element is in iframe, still set up position updates
      // (though they may not be needed until tour becomes visible)
      this.setupIframePositionUpdate(iframeElementInfo);
    }

    // Update store after all scrolling is complete
    this.isUpdatingStore = true;
    this.setStore({
      ...store,
      progress,
      currentStepIndex: index,
      totalSteps: total,
      triggerRef,
      openState,
      iframeElementInfo, // Store iframe info for component use
    });
    this.isUpdatingStore = false;

    console.log('[Tour] Store updated with triggerRef:', triggerRef);

    // Check if this is the last step and if it has triggers
    // If it has triggers, we should wait for them to complete before reporting flow completion
    // Only report completion here (after element is found) if there are no triggers
    // IMPORTANT: When navigating via STEP_GOTO, don't report completion immediately - 
    // the step might have triggers that navigate elsewhere, or might be closed/dismissed
    const wasNavigatingToStep = this.isNavigatingToStep; // Remember if we were navigating
    const { isComplete } = this.getCurrentStepInfo(step);
    const hasTriggers = step.trigger && step.trigger.length > 0 && 
                        step.trigger.some(t => t.conditions && t.conditions.length > 0);
    const hasStepNavigationActions = step.target?.actions?.some(
      (action: RulesCondition) => action.type === ContentActionsItemType.STEP_GOTO
    );
    
    // Only reset navigation flag AFTER we've checked it for completion logic
    // But add a small delay to ensure the step is fully set up before allowing completion
    if (wasNavigatingToStep) {
      // When navigating to a step, always defer completion check - wait for user interaction
      // or step dismissal. This prevents premature completion when triggers navigate to steps.
      console.log('[Tour] Step was navigated to via STEP_GOTO - deferring completion check');
      setTimeout(() => {
        this.isNavigatingToStep = false;
      }, 100);
    } else {
      this.isNavigatingToStep = false;
    }
    
    if (isComplete && !hasTriggers && !hasStepNavigationActions && !wasNavigatingToStep) {
      // Only report completion immediately if:
      // 1. It's the last step
      // 2. There are no triggers that might navigate elsewhere
      // 3. There are no step navigation actions that might navigate elsewhere
      // 4. We didn't just navigate to this step via STEP_GOTO (always defer in that case)
      // Otherwise, completion will be reported when the step is closed or all navigation is complete
      await this.reportStepEvents(step, BizEvents.FLOW_COMPLETED);
    }

    // If the tour is temporarily hidden, unset the active tour
    if (!openState) {
      this.unsetActiveTour();
    }
    
    // Reset the processing flag
    this.isProcessingElementFound = false;
    console.log('[Tour] === handleElementFound COMPLETED ===');
  }

  private handleElementChanged(el: Element, step: Step, store: TourStore): void {
    // Prevent infinite loops
    if (this.isUpdatingStore) {
      console.log('[Tour] Already updating store, skipping handleElementChanged');
      return;
    }
    
    console.log('[Tour] === handleElementChanged CALLED ===');
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      console.log('[Tour] Step mismatch in handleElementChanged, ignoring');
      return;
    }

    console.log('[Tour] Element changed for step:', step.cvid, 'Element:', el);
    // Check if element is in iframe
    const iframeElementInfo = this.watcher?.getIframeElementInfo();
    let triggerRef: Element = el;

    if (iframeElementInfo) {
      // For iframe elements, we need to create a virtual element that represents
      // the target element's position for positioning purposes
      triggerRef = this.createVirtualElementForIframe(iframeElementInfo);
      
      // Set up scroll/resize listeners to keep position updated
      this.setupIframePositionUpdate(iframeElementInfo);
    }

    // Update store with guard
    this.isUpdatingStore = true;
    this.setStore({
      ...store,
      triggerRef,
      iframeElementInfo, // Store iframe info for component use
    });
    this.isUpdatingStore = false;
    console.log('[Tour] Store updated in handleElementChanged with triggerRef:', triggerRef);
  }

  /**
   * Handles when the target element is not found
   * @private
   */
  private async handleElementNotFound(step: Step): Promise<void> {
    const currentStep = this.getCurrentStep();
    if (currentStep?.cvid !== step.cvid) {
      return;
    }
    await this.reportTooltipTargetMissingEvent(step);
    await this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
  }

  /**
   * Creates a virtual element for iframe positioning
   * @private
   */
  private createVirtualElementForIframe(iframeElementInfo: IframeElementInfo): Element {
    if (!document) {
      throw new Error('Document is not available');
    }
    
    // Get the target element's position within the iframe
    const targetElement = iframeElementInfo.element;
    const targetRect = targetElement.getBoundingClientRect();
    
    // Calculate the target element's position relative to the main document
    const iframeRect = iframeElementInfo.iframeRect;
    const targetLeft = iframeRect.left + targetRect.left;
    const targetTop = iframeRect.top + targetRect.top;
    
    // Create a virtual element that represents the target element's position
    // This is used for positioning the tour step relative to the actual target element
    // Use 'fixed' position to match floating-ui's 'fixed' strategy (viewport-relative)
    const virtualElement = document.createElement('div');
    virtualElement.style.position = 'fixed';
    virtualElement.style.left = `${targetLeft}px`;
    virtualElement.style.top = `${targetTop}px`;
    virtualElement.style.width = `${targetRect.width}px`;
    virtualElement.style.height = `${targetRect.height}px`;
    virtualElement.style.pointerEvents = 'none';
    virtualElement.style.visibility = 'hidden';
    
    // Add to DOM temporarily for positioning calculations
    document.body.appendChild(virtualElement);
    
    // Store reference for cleanup
    (virtualElement as any).__usertour_virtual_iframe = true;
    (virtualElement as any).__usertour_iframe_info = iframeElementInfo;
    
    console.log('[Tour] Created virtual element for target element:', {
      targetRect,
      iframeRect,
      virtualPosition: { left: targetLeft, top: targetTop, width: targetRect.width, height: targetRect.height }
    });
    
    return virtualElement;
  }

  /**
   * Sets up iframe communication for step progression
   * @private
   */
  private setupIframeCommunication(step: Step, iframeElementInfo: IframeElementInfo): void {
    // Use step ID as unique handler identifier
    const handlerId = `tour-step-${step.cvid}`;
    
    // Set up communication handler with unique ID
    iframeUtils.setCommunicationHandler(handlerId, {
      onStepComplete: (stepId: string, data?: any) => {
        if (stepId === step.cvid) {
          this.handleIframeStepComplete(step, data);
        }
      },
      onStepAction: (stepId: string, action: string, data?: any) => {
        if (stepId === step.cvid) {
          this.handleIframeStepAction(step, action, data);
        }
      },
      onElementFound: (element: IframeElementInfo) => {
        // Element found in iframe, update positioning
        this.updateIframeElementPosition(element);
      },
      onElementNotFound: (_selector: any) => {
        // Element not found in iframe, handle timeout
        this.handleElementNotFound(step);
      },
    });

    // Try to inject SDK into iframe if it's same-origin
    if (iframeUtils.isIframeAccessible(iframeElementInfo.iframe)) {
      // Retry logic for handling iframe src changes with delayed content loading
      const sendFindElementMessage = (retryCount = 0, maxRetries = 8) => {
        // Check visibility before sending message (iframe might become hidden during retries)
        if (!iframeUtils.isIframeCSSVisible(iframeElementInfo.iframe)) {
          console.log('[Tour] Iframe became hidden, stopping message retries');
          return;
        }
        
        const message = {
          type: 'usertour-find-element' as const,
          element: step.target,
          stepId: step.cvid,
          actions: step.target?.actions,
          triggers: step.trigger // Include triggers for iframe evaluation
        };
        
        iframeUtils.sendMessageToIframe(iframeElementInfo.iframe, message);
        
        // Verify element exists in iframe after sending message
        // This is important for src changes where content takes time to load
        if (retryCount < maxRetries && step.target) {
          // Use exponential backoff: 300ms, 600ms, 900ms, 1200ms, etc.
          const delay = Math.min(300 * (retryCount + 1), 2000);
          setTimeout(() => {
            try {
              // Check visibility before retry
              if (!iframeUtils.isIframeCSSVisible(iframeElementInfo.iframe)) {
                console.log('[Tour] Iframe became hidden during retry, stopping');
                return;
              }
              
              const iframeDoc = iframeElementInfo.iframe.contentDocument;
              if (iframeDoc && step.target) {
                const elementInIframe = finderV2(step.target, iframeDoc);
                if (!elementInIframe) {
                  sendFindElementMessage(retryCount + 1, maxRetries);
                }
              } else {
                // Iframe might be reloading, retry
                if (iframeDoc) {
                  sendFindElementMessage(retryCount + 1, maxRetries);
                }
              }
            } catch (error) {
              // Retry on error
              if (retryCount < maxRetries) {
                sendFindElementMessage(retryCount + 1, maxRetries);
              }
            }
          }, delay);
        }
      };
      
      iframeUtils.injectSDKIntoIframe(iframeElementInfo.iframe).then(() => {
        // After SDK injection, wait a bit for SDK to initialize, then send message
        setTimeout(() => {
          sendFindElementMessage();
        }, 200); // Wait 200ms for SDK to initialize
      }).catch(() => {
        // Error injecting SDK
      });
    }
  }

  /**
   * Handles step completion from iframe
   * @private
   */
  private async handleIframeStepComplete(step: Step, _data?: any): Promise<void> {
    // Report step completion
    await this.reportStepEvents(step, BizEvents.FLOW_STEP_COMPLETED);
    
    // Move to next step
    await this.moveToNextStep();
  }

  /**
   * Moves to the next step in the tour
   * @private
   */
  private async moveToNextStep(): Promise<void> {
    const content = this.getContent();
    const currentStep = this.getCurrentStep();
    
    if (!currentStep || !content.steps) {
      return;
    }
    
    // Clean up iframe listeners for current step before moving to next
    const currentIndex = content.steps.findIndex(step => step.cvid === currentStep.cvid);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < content.steps.length) {
      // Move to next step - clean up current step before moving
      const iframeInfo = this.watcher?.getIframeElementInfo();
      if (iframeInfo && currentStep.cvid) {
        iframeUtils.sendCleanupMessageToIframe(iframeInfo.iframe, currentStep.cvid);
      }
      
      const nextStep = content.steps[nextIndex];
      await this.show(nextStep.cvid);
    } else {
      // Tour completed - cleanup will happen in close() method
      await this.close(contentEndReason.USER_CLOSED);
    }
  }

  /**
   * Handles step action from iframe
   * @private
   */
  private async handleIframeStepAction(step: Step, action: string, data?: any): Promise<void> {
    if (action === 'handleActions' && data?.actions) {
      // Handle the actions sent from iframe
      await this.handleActions(data.actions);
    } else {
      // Handle specific actions based on step configuration
      const actions = step.target?.actions || [];
      const matchingAction = actions.find(a => (a as any).action === action);
      
      if (matchingAction) {
        await this.handleActions([matchingAction]);
      }
    }
  }

  /**
   * Cleans up iframe communication handler for a step
   * @private
   */
  private cleanupIframeCommunication(step: Step): void {
    const handlerId = `tour-step-${step.cvid}`;
    iframeUtils.removeCommunicationHandler(handlerId);
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
          // Cannot access iframe window for scroll detection
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

      let checkCount = 0;
      function check() {
        checkCount++;
        
        // For iframe elements, check scroll position instead of element position
        // because getBoundingClientRect is relative to iframe viewport
        if (iframeWindow && iframeDoc) {
          const scrollTop = iframeWindow.pageYOffset || iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop || 0;
          const scrollLeft = iframeWindow.pageXOffset || iframeDoc.documentElement.scrollLeft || iframeDoc.body.scrollLeft || 0;

          // Check if scroll position has stabilized
          if (scrollTop === lastScrollTop && scrollLeft === lastScrollLeft) {
            if (same++ > 2) {
              clearTimeout(timeoutId);
              console.log('[Tour] [SCROLL-2] Iframe scroll completed, scroll position stabilized after', checkCount, 'checks');
              console.log('[Tour] [SCROLL-2] Final scroll position:', { top: scrollTop, left: scrollLeft });
              resolve();
              return;
            }
          } else {
            if (checkCount <= 5 || checkCount % 10 === 0) {
              console.log('[Tour] [SCROLL-2] Scroll check', checkCount + ':', {
                scrollTop,
                scrollLeft,
                lastScrollTop,
                lastScrollLeft,
                sameCount: same
              });
            }
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
              console.log('[Tour] [SCROLL-2] Iframe element scroll completed, position stabilized after', checkCount, 'checks');
              console.log('[Tour] [SCROLL-2] Final element position:', rect);
              resolve();
              return;
            }
          } else {
            if (checkCount <= 5 || checkCount % 10 === 0) {
              console.log('[Tour] [SCROLL-2] Scroll check', checkCount + ':', {
                elementTop,
                lastScrollTop,
                sameCount: same
              });
            }
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
        console.log('[Tour] [UPDATE] Target element no longer connected, skipping position update');
        return;
      }
      
      const oldVirtualPosition = {
        left: elementToUpdate.style.left,
        top: elementToUpdate.style.top,
        width: elementToUpdate.style.width,
        height: elementToUpdate.style.height
      };
      
      const targetRect = targetElement.getBoundingClientRect();
      
      // Get the current iframe position
      const oldIframeRect = { ...iframeElementInfo.iframeRect };
      const iframeRect = iframeElementInfo.iframe.getBoundingClientRect();
      
      // Calculate the target element's position relative to the main document
      const targetLeft = iframeRect.left + targetRect.left;
      const targetTop = iframeRect.top + targetRect.top;
      
      console.log('[Tour] [UPDATE] Position update details:', {
        targetElementRect: targetRect,
        iframeRect: {
          old: oldIframeRect,
          new: iframeRect,
          changed: iframeRect.left !== oldIframeRect.left || iframeRect.top !== oldIframeRect.top
        },
        calculatedVirtualPosition: { left: targetLeft, top: targetTop },
        oldVirtualPosition,
        change: {
          leftDiff: targetLeft - parseFloat(oldVirtualPosition.left || '0'),
          topDiff: targetTop - parseFloat(oldVirtualPosition.top || '0')
        }
      });
      
      // Update virtual element to match target element's position and size
      elementToUpdate.style.left = `${targetLeft}px`;
      elementToUpdate.style.top = `${targetTop}px`;
      elementToUpdate.style.width = `${targetRect.width}px`;
      elementToUpdate.style.height = `${targetRect.height}px`;
      
      console.log('[Tour] [UPDATE] Virtual element updated to:', {
        left: elementToUpdate.style.left,
        top: elementToUpdate.style.top,
        width: elementToUpdate.style.width,
        height: elementToUpdate.style.height
      });
      
      // Update the stored iframe rect to keep it in sync
      iframeElementInfo.iframeRect = iframeRect;
    } else {
      console.log('[Tour] [UPDATE] Virtual element not found for position update');
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
   * Display a modal step in the tour
   * This method handles:
   * 1. Building the store data
   * 2. Reporting step seen event
   * 3. Setting up the modal state
   * 4. Reporting completion event if it's the last step
   *
   * @param currentStep - The step to be displayed as a modal
   */
  async showModal(currentStep: Step) {
    // Build store data and get step information
    const store = await this.buildStoreData();
    const { progress, isComplete, index, total } = this.getCurrentStepInfo(currentStep);

    // Report that the step has been seen
    await this.reportStepEvents(currentStep, BizEvents.FLOW_STEP_SEEN);

    // Activate trigger conditions
    await this.activeTriggerConditions();

    // Set up modal state
    const openState = !this.isTemporarilyHidden();
    this.setStore({
      ...store,
      openState,
      progress,
      currentStepIndex: index, // Convert to 0-based index
      totalSteps: total,
    });

    // Check if this is the last step and if it has triggers
    // If it has triggers, we should wait for them to complete before reporting flow completion
    const hasTriggers = currentStep.trigger && currentStep.trigger.length > 0 && 
                        currentStep.trigger.some(t => t.conditions && t.conditions.length > 0);
    
    if (isComplete && !hasTriggers) {
      // Only report completion immediately if there are no triggers
      // If triggers exist, completion will be reported when the step is closed or triggers execute
      await this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
    }

    // If the tour is temporarily hidden, unset the active tour
    if (!openState) {
      this.unsetActiveTour();
    }
  }

  /**
   * Displays a hidden step in the tour
   * This method handles:
   * 1. Reporting the step seen event
   * 2. Reporting the completion event if it's the last step
   *
   */
  async showHidden(currentStep: Step) {
    const { isComplete } = this.getCurrentStepInfo(currentStep);

    // Report that the step has been seen
    await this.reportStepEvents(currentStep, BizEvents.FLOW_STEP_SEEN);

    // Check if this is the last step and if it has triggers
    // If it has triggers, we should wait for them to complete before reporting flow completion
    const hasTriggers = currentStep.trigger && currentStep.trigger.length > 0 && 
                        currentStep.trigger.some(t => t.conditions && t.conditions.length > 0);
    
    if (isComplete && !hasTriggers) {
      // Only report completion immediately if there are no triggers
      // If triggers exist, completion will be reported when the step is closed or triggers execute
      await this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
    }
  }

  /**
   * Close the current tour
   * This method handles:
   * 1. Validating the tour state
   * 2. Reporting the close event
   * 3. Setting the tour as dismissed
   * 4. Cleaning up resources
   *
   * @param reason - The reason for closing the tour, defaults to USER_CLOSED
   */
  async close(reason: contentEndReason = contentEndReason.USER_CLOSED) {
    console.log('[Tour] === CLOSING TOUR ===');
    console.log('[Tour] Close reason:', reason);
    
    // Hide the tooltip UI first
    this.hide();
    
    // Clean up iframe listeners before closing
    if (this.watcher) {
      const iframeInfo = this.watcher.getIframeElementInfo();
      if (iframeInfo) {
        const currentStep = this.getCurrentStep();
        if (currentStep?.cvid) {
          iframeUtils.sendCleanupMessageToIframe(iframeInfo.iframe, currentStep.cvid);
        }
      }
    }
    
    // Clean up position update listeners
    this.cleanupIframePositionUpdate();
    
    // If this is the last step and flow completion hasn't been reported yet, report it now
    // BUT: Don't report completion if the step was closed due to missing target
    // (step was never successfully shown, so it shouldn't count as completion)
    const currentStep = this.getCurrentStep();
    if (currentStep && reason !== contentEndReason.TOOLTIP_TARGET_MISSING) {
      const { isComplete } = this.getCurrentStepInfo(currentStep);
      // Check if this step has triggers that might navigate elsewhere
      const hasTriggers = currentStep.trigger && currentStep.trigger.length > 0 && 
                          currentStep.trigger.some(t => t.conditions && t.conditions.length > 0);
      const hasStepNavigationActions = currentStep.target?.actions?.some(
        (action: RulesCondition) => action.type === ContentActionsItemType.STEP_GOTO
      );
      
      // Only report completion if:
      // 1. It's the last step
      // 2. It hasn't been reported yet
      // 3. There are no active triggers that might navigate elsewhere
      // 4. There are no step navigation actions that might navigate elsewhere
      if (isComplete && !this.flowCompletedReported && !hasTriggers && !hasStepNavigationActions) {
        console.log('[Tour] Last step is being closed - reporting flow completion');
        await this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
      }
    }
    
    // Always clear navigation flag when closing
    this.isNavigatingToStep = false;
    
    // Report close event
    await this.reportCloseEvent(reason);
    // Set the tour as dismissed
    this.setDismissed(true);
    // Set the tour as not started
    this.setStarted(false);
    // Destroy the tour
    this.destroy();
  }

  async handleClose(reason?: contentEndReason) {
    await this.close(reason);
  }

  /**
   * Handles the actions for the current step
   * This method executes all actions in sequence
   *
   * @param actions - The actions to be handled
   */
  async handleActions(actions: RulesCondition[]) {
    console.log('[Tour] === HANDLE ACTIONS ===');
    console.log('[Tour] Actions received:', actions);
    console.log('[Tour] Actions count:', actions.length);
    
    // Split actions into two groups
    const pageNavigateActions = actions.filter(
      (action) => action.type === ContentActionsItemType.PAGE_NAVIGATE,
    );
    const otherActions = actions.filter(
      (action) => action.type !== ContentActionsItemType.PAGE_NAVIGATE,
    );
    
    console.log('[Tour] Page navigate actions:', pageNavigateActions);
    console.log('[Tour] Other actions:', otherActions);

    // Execute non-PAGE_NAVIGATE actions first
    for (const action of otherActions) {
      console.log('[Tour] Processing action:', action);
      if (action.type === ContentActionsItemType.STEP_GOTO) {
        console.log('[Tour] Executing STEP_GOTO to:', action.data.stepCvid);
        this.isNavigatingToStep = true; // Mark that we're navigating to prevent premature completion
        await this.show(action.data.stepCvid);
        // Note: isNavigatingToStep will be cleared in handleElementFound after the element is found
        // or after a timeout if element is not found (handled in displayStep/close)
      } else if (action.type === ContentActionsItemType.FLOW_START) {
        console.log('[Tour] Executing FLOW_START:', action.data);
        await this.startNewContent(action.data.contentId, action.data.stepCvid);
      } else if (action.type === ContentActionsItemType.FLOW_DISMIS) {
        console.log('[Tour] Executing FLOW_DISMIS');
        // When flow is dismissed via action, report completion if not already reported
        const currentStep = this.getCurrentStep();
        if (currentStep && !this.flowCompletedReported) {
          console.log('[Tour] FLOW_DISMIS - reporting flow completion');
          await this.reportStepEvents(currentStep, BizEvents.FLOW_COMPLETED);
        }
        await this.handleClose(contentEndReason.USER_CLOSED);
      } else if (action.type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        console.log('[Tour] Executing JAVASCRIPT_EVALUATE:', action.data.value);
        evalCode(action.data.value);
      }
    }

    // Execute PAGE_NAVIGATE actions last
    for (const action of pageNavigateActions) {
      console.log('[Tour] Executing PAGE_NAVIGATE:', action.data);
      this.handleNavigate(action.data);
    }
  }

  /**
   * Handles the click event on an element
   * This method handles:
   * 1. Updating the user's attributes if the element is a question element
   * 2. Reporting the question answer event
   * 3. Handling any actions associated with the element
   *
   * @param element - The element that was clicked
   * @param value - The value of the element
   */
  async handleOnClick(element: ContentEditorClickableElement, value?: any) {
    if (isQuestionElement(element)) {
      const el = element as ContentEditorQuestionElement;
      if (el?.data?.bindToAttribute && el?.data?.selectedAttribute) {
        await this.updateUser({
          [el.data.selectedAttribute]: value,
        });
      }
      await this.reportQuestionAnswer(el, value);
    }
    if (element?.data?.actions) {
      await this.handleActions(element.data.actions);
    }
  }

  /**
   * Reports the question answer event
   * This method handles:
   * 1. Reporting the question answer event with the correct event name
   * 2. Adding the question cvid, name, and type to the event data
   * 3. Handling multiple choice, scale, NPS, and star rating elements
   *
   * @param element - The question element that was answered
   * @param value - The value of the answer
   */
  async reportQuestionAnswer(element: ContentEditorQuestionElement, value?: any) {
    const { data, type } = element;
    const { cvid } = data;
    const eventData: any = {
      [EventAttributes.QUESTION_CVID]: cvid,
      [EventAttributes.QUESTION_NAME]: data.name,
      [EventAttributes.QUESTION_TYPE]: type,
    };
    if (element.type === ContentEditorElementType.MULTIPLE_CHOICE) {
      if (element.data.allowMultiple) {
        eventData[EventAttributes.LIST_ANSWER] = value as string[];
      } else {
        eventData[EventAttributes.TEXT_ANSWER] = value;
      }
    } else if (
      element.type === ContentEditorElementType.SCALE ||
      element.type === ContentEditorElementType.NPS ||
      element.type === ContentEditorElementType.STAR_RATING
    ) {
      eventData[EventAttributes.NUMBER_ANSWER] = value;
    } else if (
      element.type === ContentEditorElementType.SINGLE_LINE_TEXT ||
      element.type === ContentEditorElementType.MULTI_LINE_TEXT
    ) {
      eventData[EventAttributes.TEXT_ANSWER] = value;
    }
    await this.reportEventWithSession({
      eventName: BizEvents.QUESTION_ANSWERED,
      eventData,
    });
  }

  /**
   * Checks and updates the visibility state of the current step
   * This method handles:
   * 1. Validating the current step state
   * 2. Handling temporarily hidden state
   * 3. Managing modal visibility
   * 4. Checking tooltip target visibility
   *
   * @returns {Promise<void>}
   */
  async checkStepVisible(): Promise<void> {
    const store = this.getStore()?.getSnapshot();
    if (!store) {
      return;
    }
    const { triggerRef, currentStep, openState } = store;

    // Early return if no current step
    if (!this.getCurrentStep() || !currentStep) {
      return;
    }

    // Handle temporarily hidden state
    if (this.isTemporarilyHidden()) {
      if (openState) {
        this.hide();
      }
      this.unsetActiveTour();
      return;
    }

    // Handle modal visibility
    if (currentStep.type === StepContentType.MODAL) {
      if (!openState) {
        this.open();
      }
      return;
    }

    // Handle tooltip visibility
    await this.checkTooltipVisibility(currentStep, triggerRef, openState);
  }

  /**
   * Checks and updates the visibility of a tooltip step
   * @private
   */
  private async checkTooltipVisibility(
    currentStep: Step,
    triggerRef: Element | null,
    currentOpenState: boolean,
  ): Promise<void> {
    // Early return if not a tooltip or missing required data
    if (
      !triggerRef ||
      !this.watcher ||
      !currentStep?.cvid ||
      currentStep.type !== StepContentType.TOOLTIP
    ) {
      return;
    }

    // Check element visibility
    const { isHidden, isTimeout } = await this.watcher.checkVisibility();

    // Update visibility state
    if (!isHidden) {
      if (!currentOpenState) {
        this.open();
      }
      return;
    }

    // Handle timeout or hidden state
    if (isTimeout) {
      await this.close(contentEndReason.TOOLTIP_TARGET_MISSING);
    } else {
      this.hide();
    }
  }

  /**
   * Activates and processes trigger conditions for the current step
   * This method:
   * 1. Processes each trigger's conditions
   * 2. Executes actions for triggers with met conditions
   * 3. Updates the step with remaining triggers
   *
   * @returns {Promise<void>}
   */
  async activeTriggerConditions(): Promise<void> {
    const currentStep = this.getCurrentStep();

    // Early return if no triggers to process
    if (!currentStep?.trigger?.length) {
      return;
    }

    // Process triggers and collect remaining ones
    const remainingTriggers = await this.processTriggers(currentStep.trigger);

    // Update step with remaining triggers if step hasn't changed
    await this.updateStepWithRemainingTriggers(currentStep, remainingTriggers);
  }

  /**
   * Processes a list of triggers and executes actions for those with met conditions
   * @private
   */
  private async processTriggers(triggers: StepTrigger[]): Promise<StepTrigger[]> {
    const remainingTriggers: StepTrigger[] = [];
    const MAX_WAIT_TIME = 300; // Maximum wait time in seconds
    for (const trigger of triggers) {
      const { conditions, ...rest } = trigger;
      const activatedConditions = await activedRulesConditions(conditions);

      if (!isActive(activatedConditions)) {
        remainingTriggers.push({
          ...rest,
          conditions: activatedConditions,
        });
      } else {
        const waitTime = Math.min(trigger.wait ?? 0, MAX_WAIT_TIME);
        if (waitTime > 0) {
          const timeoutId = setTimeout(() => {
            // Execute actions immediately when conditions are met
            this.handleActions(trigger.actions);
            // Remove the timeout ID from the array after execution
            this.triggerTimeouts = this.triggerTimeouts.filter((id) => id !== timeoutId);
          }, waitTime * 1000);
          // Store the timeout ID
          this.triggerTimeouts.push(timeoutId);
        } else {
          // Execute actions immediately when conditions are met
          await this.handleActions(trigger.actions);
        }
      }
    }

    return remainingTriggers;
  }

  /**
   * Updates the current step with remaining triggers if the step hasn't changed
   * @private
   */
  private async updateStepWithRemainingTriggers(
    originalStep: Step,
    remainingTriggers: StepTrigger[],
  ): Promise<void> {
    const newCurrentStep = this.getCurrentStep();

    // Only update if the step hasn't changed
    if (!newCurrentStep || originalStep.cvid !== newCurrentStep.cvid) {
      return;
    }

    this.setCurrentStep({
      ...newCurrentStep,
      trigger: remainingTriggers,
    });
  }

  /**
   * Checks if this tour instance is the currently active tour
   * @returns {boolean} True if this tour is the active tour, false otherwise
   */
  isActiveTour(): boolean {
    return this.getActiveTour() === this;
  }

  /**
   * Checks if the tour is currently visible and active
   * A tour is considered shown when:
   * 1. It is the active tour
   * 2. It has a current step
   * 3. Its open state is true
   *
   * @returns {boolean} True if the tour is visible and active, false otherwise
   */
  isShow(): boolean {
    const openState = this.getStore().getSnapshot()?.openState || false;
    return this.isActiveTour() && Boolean(this.getCurrentStep()) && openState;
  }

  /**
   * Resets the tour
   */
  reset() {
    console.log('[Tour] === RESETTING TOUR ===');
    
    // Clean up iframe listeners before reset
    if (this.watcher) {
      const iframeInfo = this.watcher.getIframeElementInfo();
      if (iframeInfo) {
        const currentStep = this.getCurrentStep();
        if (currentStep?.cvid) {
          iframeUtils.sendCleanupMessageToIframe(iframeInfo.iframe, currentStep.cvid);
        }
      }
    }
    
    // Clean up position update listeners
    this.cleanupIframePositionUpdate();
    
    // Clean up all iframe communication handlers
    iframeUtils.removeAllCommunicationHandlers();
    
    // Clean up all iframe SDK instances across all iframes
    iframeUtils.sendCleanupAllStepsToAllIframes();
    
    // Clear all pending timeouts
    for (const timeoutId of this.triggerTimeouts) {
      clearTimeout(timeoutId);
    }
    this.triggerTimeouts = [];
    
    // Destroy the element watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
    
    // Reset flags
    this.isUpdatingStore = false;
    this.isProcessingElementFound = false;
    this.flowCompletedReported = false;
    // Don't reset isNavigatingToStep here - it should persist through reset
    // when navigating via STEP_GOTO, and will be cleared in handleElementFound
    
    // Reset state
    this.setCurrentStep(null);
    this.setStore(undefined);
    
    console.log('[Tour] Tour reset completed');
  }

  /**
   * Destroys the tour
   */
  destroy() {
    // Clear all pending timeouts
    for (const timeoutId of this.triggerTimeouts) {
      clearTimeout(timeoutId);
    }
    this.triggerTimeouts = [];

    // Clean up iframe listeners for current step
    if (this.watcher) {
      const currentIframeInfo = this.watcher.getIframeElementInfo();
      if (currentIframeInfo) {
        iframeUtils.sendCleanupMessageToIframe(currentIframeInfo.iframe, this.getCurrentStep()?.cvid || '');
      }
    }
    
    // Clean up position update listeners
    this.cleanupIframePositionUpdate();

    // Clean up all iframe communication handlers
    iframeUtils.removeAllCommunicationHandlers();

    // Unset the active tour reference
    if (this.isActiveTour()) {
      this.unsetActiveTour();
    }
    // Reset the tour
    this.reset();
    // Destroy the element watcher
    if (this.watcher) {
      this.watcher.destroy();
      this.watcher = null;
    }
  }

  /**
   * Initializes event listeners
   */
  initializeEventListeners() {}

  /**
   * Get detailed information about the current step
   * @param currentStep - The current step to get information for
   * @returns Object containing step information including:
   *          - total: Total number of steps in the tour
   *          - index: Current step index (0-based)
   *          - progress: Progress percentage (0-100)
   *          - isComplete: Whether this is the last step
   */
  getCurrentStepInfo(currentStep: Step) {
    const content = this.getContent();
    const total = content.steps?.length ?? 0;
    const index = content.steps?.findIndex((step) => step.cvid === currentStep.cvid) ?? 0;
    const progress = Math.round(((index + 1) / total) * 100);
    const isExplicitCompletionStep = currentStep.setting.explicitCompletionStep;
    const isComplete = isExplicitCompletionStep ? isExplicitCompletionStep : index + 1 === total;

    return { total, index, progress, isComplete };
  }

  /**
   * Handle additional logic after content is shown
   * @param _isNewSession - Whether this is a new session
   */
  async handleAfterShow(_isNewSession?: boolean) {
    // Tour has no additional logic, can be empty implementation
  }

  /**
   * Reports the close event
   * @param reason - The reason for the close
   */
  private async reportCloseEvent(reason: contentEndReason) {
    const currentStep = this.getCurrentStep();
    const eventData: Record<string, any> = {
      [EventAttributes.FLOW_END_REASON]: reason,
      [EventAttributes.FLOW_VERSION_ID]: this.getContent().id,
      [EventAttributes.FLOW_VERSION_NUMBER]: this.getContent().sequence,
    };

    if (currentStep) {
      const { index, progress } = this.getCurrentStepInfo(currentStep);
      Object.assign(eventData, {
        [EventAttributes.FLOW_STEP_NUMBER]: index,
        [EventAttributes.FLOW_STEP_CVID]: currentStep.cvid,
        [EventAttributes.FLOW_STEP_NAME]: currentStep.name,
        [EventAttributes.FLOW_STEP_PROGRESS]: progress,
      });
    }

    await this.reportEventWithSession({
      eventName: BizEvents.FLOW_ENDED,
      eventData,
    });
  }

  /**
   * Reports the tooltip target missing event
   * @param currentStep - The current step where target is missing
   */
  private async reportTooltipTargetMissingEvent(currentStep: Step) {
    const { index, progress } = this.getCurrentStepInfo(currentStep);

    await this.reportEventWithSession({
      eventName: BizEvents.TOOLTIP_TARGET_MISSING,
      eventData: {
        [EventAttributes.FLOW_VERSION_ID]: this.getContent().id,
        [EventAttributes.FLOW_VERSION_NUMBER]: this.getContent().sequence,
        [EventAttributes.FLOW_STEP_NUMBER]: index,
        [EventAttributes.FLOW_STEP_CVID]: currentStep.cvid,
        [EventAttributes.FLOW_STEP_NAME]: currentStep.name,
        [EventAttributes.FLOW_STEP_PROGRESS]: progress,
      },
    });
  }

  /**
   * Reports the step events
   * @param currentStep - The current step
   * @param index - The index of the current step
   * @param progress - The progress of the current step
   * @param isComplete - Whether the current step is complete
   */
  private async reportStepEvents(currentStep: Step, eventName: BizEvents) {
    // Check if this is a FLOW_COMPLETED event and if it has already been reported
    if (eventName === BizEvents.FLOW_COMPLETED && this.flowCompletedReported) {
      return;
    }

    const { index, progress } = this.getCurrentStepInfo(currentStep);

    const eventData = {
      [EventAttributes.FLOW_VERSION_ID]: this.getContent().id,
      [EventAttributes.FLOW_VERSION_NUMBER]: this.getContent().sequence,
      [EventAttributes.FLOW_STEP_NUMBER]: index,
      [EventAttributes.FLOW_STEP_CVID]: currentStep.cvid,
      [EventAttributes.FLOW_STEP_NAME]: currentStep.name,
      [EventAttributes.FLOW_STEP_PROGRESS]: Math.round(progress),
    };

    await this.reportEventWithSession({
      eventData,
      eventName,
    });

    // Mark FLOW_COMPLETED as reported if this was a completion event
    if (eventName === BizEvents.FLOW_COMPLETED) {
      this.flowCompletedReported = true;
    }
  }
}
