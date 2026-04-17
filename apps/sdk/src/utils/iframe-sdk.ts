import { ElementSelectorPropsData } from '@usertour/types';
import { logger } from './logger';
import { document, window } from './globals';
import { parseSelectorWithCondition } from './selector-parser';

/**
 * Interface for iframe SDK communication
 */
export interface IframeSDKMessage {
  type: 'usertour-step-complete' | 'usertour-step-action' | 'usertour-element-found' | 'usertour-element-not-found' | 'usertour-iframe-ready';
  stepId?: string;
  action?: string;
  element?: {
    selector: ElementSelectorPropsData;
    iframeSrc: string;
    iframeIndex: number;
  };
  data?: any;
}

/**
 * Iframe SDK for communication with parent window
 * This SDK is injected into iframes to enable communication with the parent
 */
export class IframeSDK {
  private static instance: IframeSDK;
  private messageListener?: (event: MessageEvent) => void;

  /**
   * Get singleton instance
   */
  static getInstance(): IframeSDK {
    if (!IframeSDK.instance) {
      IframeSDK.instance = new IframeSDK();
    }
    return IframeSDK.instance;
  }

  /**
   * Initialize the iframe SDK
   */
  init(): void {
    if (this.messageListener) {
      return; // Already initialized
    }

    this.messageListener = (event: MessageEvent) => {
      // Only process messages from parent window
      if (!window || event.source !== window.parent) {
        return;
      }

      try {
        const message = event.data;

        if (!message.type || !message.type.startsWith('usertour-')) {
          return;
        }

        switch (message.type) {
          case 'usertour-find-element':
            this.handleFindElement(message);
            break;
          case 'usertour-step-action':
            this.handleStepAction(message.stepId, message.action, message.data);
            break;
        }
      } catch (error) {
        logger.error('Error processing message in iframe SDK:', error);
      }
    };

    if (window) {
      window.addEventListener('message', this.messageListener);
    }

    // Notify parent that iframe SDK is ready
    this.sendMessageToParent({
      type: 'usertour-iframe-ready',
    });
  }

  /**
   * Send message to parent window
   */
  sendMessageToParent(message: IframeSDKMessage): void {
    try {
      if (window && window.parent) {
        window.parent.postMessage(message, '*');
      }
    } catch (error) {
      logger.error('Error sending message to parent:', error);
    }
  }

  /**
   * Find element in iframe and notify parent
   */
  private handleFindElement(elementInfo: any): void {
    if (!elementInfo?.selector) {
      return;
    }

    try {
      const element = this.findElementBySelector(elementInfo.selector);

      if (element) {
        if (elementInfo.stepId) {
          this.setupElementInteraction(element, elementInfo.stepId, elementInfo.actions);
        }

        this.sendMessageToParent({
          type: 'usertour-element-found',
          element: {
            selector: elementInfo.selector,
            iframeSrc: window?.location?.href || '',
            iframeIndex: 0,
          },
        });
      } else {
        this.sendMessageToParent({
          type: 'usertour-element-not-found',
          element: {
            selector: elementInfo.selector,
            iframeSrc: window?.location?.href || '',
            iframeIndex: 0,
          },
        });
      }
    } catch (error) {
      logger.error('Error finding element in iframe:', error);
      this.sendMessageToParent({
        type: 'usertour-element-not-found',
        element: {
          selector: elementInfo.selector,
          iframeSrc: window?.location?.href || '',
          iframeIndex: 0,
        },
      });
    }
  }

  /**
   * Handle step action from parent
   */
  private handleStepAction(stepId?: string, action?: string, data?: any): void {
    if (!stepId || !action) {
      return;
    }

    // Handle different step actions
    switch (action) {
      case 'complete':
        this.completeStep(stepId, data);
        break;
      case 'next':
        this.nextStep(stepId, data);
        break;
      case 'previous':
        this.previousStep(stepId, data);
        break;
      case 'skip':
        this.skipStep(stepId, data);
        break;
      default:
        logger.warn('Unknown step action:', action);
    }
  }

  /**
   * Complete a step
   */
  completeStep(stepId: string, data?: any): void {
    this.sendMessageToParent({
      type: 'usertour-step-complete',
      stepId,
      data,
    });
  }

  /**
   * Move to next step
   */
  nextStep(stepId: string, data?: any): void {
    this.sendMessageToParent({
      type: 'usertour-step-action',
      stepId,
      action: 'next',
      data,
    });
  }

  /**
   * Move to previous step
   */
  previousStep(stepId: string, data?: any): void {
    this.sendMessageToParent({
      type: 'usertour-step-action',
      stepId,
      action: 'previous',
      data,
    });
  }

  /**
   * Skip step
   */
  skipStep(stepId: string, data?: any): void {
    this.sendMessageToParent({
      type: 'usertour-step-action',
      stepId,
      action: 'skip',
      data,
    });
  }

  /**
   * Set up element interaction (click, etc.) for step progression
   * This mimics the useTargetActions hook from the parent page
   */
  setupElementInteraction(element: Element, stepId: string, actions?: any[]): void {
    if (!element) {
      return;
    }

    // Set up click listener to handle step actions
    const clickHandler = (_event: Event) => {
      if (actions && actions.length > 0) {
        const message = {
          type: 'usertour-step-action' as const,
          stepId,
          action: 'handleActions',
          data: { actions }
        };
        this.sendMessageToParent(message);
      } else {
        // Default behavior: complete the step
        this.completeStep(stepId, {
          action: 'click',
          element: element.tagName,
          timestamp: Date.now()
        });
      }
    };

    // Add click listener
    element.addEventListener('click', clickHandler);

    // Store reference for cleanup
    (element as any).__usertour_click_handler = clickHandler;
    (element as any).__usertour_step_id = stepId;
    (element as any).__usertour_actions = actions;
  }

  /**
   * Find element by selector in iframe
   */
  private findElementBySelector(selector: ElementSelectorPropsData): Element | null {
    if (!document) {
      return null;
    }

    try {
      // Parse selector to handle <<< pattern
      const parsed = parseSelectorWithCondition(selector);
      const mainSelector = parsed.mainSelector;

      // Use custom selector if available
      if (mainSelector.customSelector) {
        return document.querySelector(mainSelector.customSelector);
      }

      // Use first selector from selectors array
      if (mainSelector.selectors && mainSelector.selectors.length > 0) {
        return document.querySelector(mainSelector.selectors[0]);
      }

      // Use selectorsList if available
      if (mainSelector.selectorsList && mainSelector.selectorsList.length > 0) {
        return document.querySelector(mainSelector.selectorsList[0]);
      }

      return null;
    } catch (error) {
      logger.error('Error finding element by selector:', error);
      return null;
    }
  }

  /**
   * Clean up iframe SDK
   */
  destroy(): void {
    if (this.messageListener && window) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = undefined;
    }
  }
}

/**
 * Auto-initialize iframe SDK when script loads
 */
if (typeof window !== 'undefined' && window !== window.parent) {
  // We're in an iframe, initialize the SDK
  const iframeSDK = IframeSDK.getInstance();
  iframeSDK.init();
}

/**
 * Export singleton instance
 */
export const iframeSDK = IframeSDK.getInstance();
