import { smoothScroll } from '@usertour-packages/dom';
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
        console.log('[Tour] Cleaning up iframe listeners for previous step');
        const currentStepId = this.getCurrentStep()?.cvid;
        if (currentStepId) {
          iframeUtils.sendCleanupMessageToIframe(currentIframeInfo.iframe, currentStepId);
        }
      }
      
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
    this.watcher.findElement();
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
      console.log('[Tour] Element is in iframe, creating virtual element:', iframeElementInfo);
      // For iframe elements, we need to create a virtual element that represents
      // the target element's position for positioning purposes
      triggerRef = this.createVirtualElementForIframe(iframeElementInfo);
      
      // Set up iframe communication for step progression
      this.setupIframeCommunication(step, iframeElementInfo);
    } else {
      console.log('[Tour] Element is in main document');
    }

    // Scroll element into view if tour is visible
    if (openState) {
      if (iframeElementInfo) {
        // Scroll iframe into view instead of the element inside it
        console.log('[Tour] Scrolling iframe into view');
        smoothScroll(iframeElementInfo.iframe, { block: 'center' });
      } else {
        console.log('[Tour] Scrolling element into view');
        smoothScroll(el, { block: 'center' });
      }
    }

    // Update store
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
      console.log('[Tour] Element is in iframe, updating virtual element:', iframeElementInfo);
      // For iframe elements, we need to create a virtual element that represents
      // the target element's position for positioning purposes
      triggerRef = this.createVirtualElementForIframe(iframeElementInfo);
    } else {
      console.log('[Tour] Element is in main document');
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
    const virtualElement = document.createElement('div');
    virtualElement.style.position = 'absolute';
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
    console.log('[Tour] Setting up iframe communication for step:', step.cvid);
    
    // Use step ID as unique handler identifier
    const handlerId = `tour-step-${step.cvid}`;
    
    // Set up communication handler with unique ID
    iframeUtils.setCommunicationHandler(handlerId, {
      onStepComplete: (stepId: string, data?: any) => {
        console.log('[Tour] Received step complete from iframe:', stepId, data);
        if (stepId === step.cvid) {
          this.handleIframeStepComplete(step, data);
        }
      },
      onStepAction: (stepId: string, action: string, data?: any) => {
        console.log('[Tour] Received step action from iframe:', stepId, action, data);
        if (stepId === step.cvid) {
          this.handleIframeStepAction(step, action, data);
        }
      },
      onElementFound: (element: IframeElementInfo) => {
        console.log('[Tour] Received element found from iframe:', element);
        // Element found in iframe, update positioning
        this.updateIframeElementPosition(element);
      },
      onElementNotFound: (_selector: any) => {
        console.log('[Tour] Received element not found from iframe');
        // Element not found in iframe, handle timeout
        this.handleElementNotFound(step);
      },
    });

    // Try to inject SDK into iframe if it's same-origin
    if (iframeUtils.isIframeAccessible(iframeElementInfo.iframe)) {
      console.log('[Tour] Injecting SDK into iframe');
      iframeUtils.injectSDKIntoIframe(iframeElementInfo.iframe).then(() => {
        // After SDK injection, wait a bit for SDK to initialize, then send message
        console.log('[Tour] SDK injected, waiting for initialization...');
        setTimeout(() => {
          console.log('[Tour] Setting up element interaction for step:', step.cvid);
          console.log('[Tour] Step target:', step.target);
          console.log('[Tour] Step actions:', step.target?.actions);
          
          const message = {
            type: 'usertour-find-element' as const,
            element: step.target,
            stepId: step.cvid,
            actions: step.target?.actions,
            triggers: step.trigger // Include triggers for iframe evaluation
          };
          
          console.log('[Tour] Sending message to iframe:', message);
          console.log('[Tour] Step triggers:', step.trigger);
          iframeUtils.sendMessageToIframe(iframeElementInfo.iframe, message);
        }, 100); // Wait 100ms for SDK to initialize
      });
    } else {
      console.log('[Tour] Iframe is cross-origin, cannot inject SDK');
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
    console.log('[Tour] === MOVING TO NEXT STEP ===');
    console.log('[Tour] Current step:', currentStep.cvid);
    
    const currentIndex = content.steps.findIndex(step => step.cvid === currentStep.cvid);
    const nextIndex = currentIndex + 1;
    
    console.log('[Tour] Current step index:', currentIndex);
    console.log('[Tour] Next step index:', nextIndex);
    console.log('[Tour] Total steps:', content.steps.length);
    console.log('[Tour] Is this the last step?', nextIndex >= content.steps.length);
    
    if (nextIndex < content.steps.length) {
      // Move to next step - clean up current step before moving
      console.log('[Tour] Moving to next step, cleaning up current step');
      const iframeInfo = this.watcher?.getIframeElementInfo();
      if (iframeInfo && currentStep.cvid) {
        console.log('[Tour] Cleaning up iframe listeners before moving to next step');
        iframeUtils.sendCleanupMessageToIframe(iframeInfo.iframe, currentStep.cvid);
      }
      
      const nextStep = content.steps[nextIndex];
      await this.show(nextStep.cvid);
    } else {
      // Tour completed - cleanup will happen in close() method
      console.log('[Tour] === TOUR COMPLETED ===');
      console.log('[Tour] No more steps, closing tour');
      await this.close(contentEndReason.USER_CLOSED);
    }
  }

  /**
   * Handles step action from iframe
   * @private
   */
  private async handleIframeStepAction(step: Step, action: string, data?: any): Promise<void> {
    console.log('[Tour] === HANDLE IFRAME STEP ACTION ===');
    console.log('[Tour] Action:', action);
    console.log('[Tour] Step ID:', step.cvid);
    console.log('[Tour] Data:', data);
    console.log('[Tour] Step target actions:', step.target?.actions);
    
    if (action === 'handleActions' && data?.actions) {
      // Handle the actions sent from iframe
      console.log('[Tour] Processing actions from iframe:', data.actions);
      console.log('[Tour] Actions count:', data.actions.length);
      await this.handleActions(data.actions);
    } else {
      // Handle specific actions based on step configuration
      const actions = step.target?.actions || [];
      const matchingAction = actions.find(a => (a as any).action === action);
      
      if (matchingAction) {
        console.log('[Tour] Found matching action:', matchingAction);
        await this.handleActions([matchingAction]);
      } else {
        console.log('[Tour] No matching action found for:', action);
      }
    }
  }

  /**
   * Cleans up iframe communication handler for a step
   * @private
   */
  private cleanupIframeCommunication(step: Step): void {
    const handlerId = `tour-step-${step.cvid}`;
    console.log('[Tour] Cleaning up iframe communication for step:', step.cvid);
    iframeUtils.removeCommunicationHandler(handlerId);
  }

  /**
   * Updates iframe element position
   * @private
   */
  private updateIframeElementPosition(iframeElementInfo: IframeElementInfo): void {
    const store = this.getStore().getSnapshot();
    if (store?.iframeElementInfo) {
      // Update the virtual element position to match the target element's position
      const virtualElement = store.triggerRef as HTMLElement;
      if (virtualElement && (virtualElement as any).__usertour_virtual_iframe) {
        // Get the target element's position within the iframe
        const targetElement = iframeElementInfo.element;
        const targetRect = targetElement.getBoundingClientRect();
        
        // Calculate the target element's position relative to the main document
        const iframeRect = iframeElementInfo.iframeRect;
        const targetLeft = iframeRect.left + targetRect.left;
        const targetTop = iframeRect.top + targetRect.top;
        
        // Update virtual element to match target element's position and size
        virtualElement.style.left = `${targetLeft}px`;
        virtualElement.style.top = `${targetTop}px`;
        virtualElement.style.width = `${targetRect.width}px`;
        virtualElement.style.height = `${targetRect.height}px`;
        
        console.log('[Tour] Updated virtual element position to match target element:', {
          targetRect,
          iframeRect,
          virtualPosition: { left: targetLeft, top: targetTop, width: targetRect.width, height: targetRect.height }
        });
      }
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
        console.log('[Tour] Cleaning up iframe listeners before closing tour');
        const currentStep = this.getCurrentStep();
        if (currentStep?.cvid) {
          iframeUtils.sendCleanupMessageToIframe(iframeInfo.iframe, currentStep.cvid);
        }
      }
    }
    
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
        console.log('[Tour] Cleaning up iframe listeners on reset');
        const currentStep = this.getCurrentStep();
        if (currentStep?.cvid) {
          iframeUtils.sendCleanupMessageToIframe(iframeInfo.iframe, currentStep.cvid);
        }
      }
    }
    
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
        console.log('[Tour] Cleaning up iframe listeners on destroy');
        iframeUtils.sendCleanupMessageToIframe(currentIframeInfo.iframe, this.getCurrentStep()?.cvid || '');
      }
    }

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
