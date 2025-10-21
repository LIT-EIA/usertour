import { ElementSelectorPropsData } from '@usertour/types';
import { logger } from './logger';
import { document, window } from './globals';

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
    console.log('[IframeSDK] === INITIALIZING IFRAME SDK ===');
    console.log('[IframeSDK] Window available:', !!window);
    console.log('[IframeSDK] Window parent available:', !!(window && window.parent));
    
    if (this.messageListener) {
      console.log('[IframeSDK] Already initialized');
      return; // Already initialized
    }

    this.messageListener = (event: MessageEvent) => {
      console.log('[IframeSDK] === MESSAGE RECEIVED ===');
      console.log('[IframeSDK] Event source:', event.source);
      console.log('[IframeSDK] Event origin:', event.origin);
      console.log('[IframeSDK] Event data:', event.data);
      
      // Only process messages from parent window
      if (!window || event.source !== window.parent) {
        console.log('[IframeSDK] Message not from parent, ignoring');
        return;
      }

      try {
        const message = event.data;
        
        if (!message.type || !message.type.startsWith('usertour-')) {
          console.log('[IframeSDK] Message not a usertour message, ignoring');
          return;
        }

        console.log('[IframeSDK] Processing message type:', message.type);
        switch (message.type) {
          case 'usertour-find-element':
            console.log('[IframeSDK] === HANDLING FIND ELEMENT MESSAGE ===');
            console.log('[IframeSDK] Message data:', message);
            this.handleFindElement(message);
            break;
          case 'usertour-step-action':
            console.log('[IframeSDK] === HANDLING STEP ACTION MESSAGE ===');
            console.log('[IframeSDK] Step action data:', message);
            this.handleStepAction(message.stepId, message.action, message.data);
            break;
        }
      } catch (error) {
        console.log('[IframeSDK] Error handling message:', error);
        logger.error('Error processing message in iframe SDK:', error);
      }
    };

    if (window) {
      window.addEventListener('message', this.messageListener);
      console.log('[IframeSDK] Message listener added');
    }

    // Notify parent that iframe SDK is ready
    console.log('[IframeSDK] Notifying parent that SDK is ready');
    this.sendMessageToParent({
      type: 'usertour-iframe-ready',
    });
  }

  /**
   * Send message to parent window
   */
  sendMessageToParent(message: IframeSDKMessage): void {
    console.log('[IframeSDK] Sending message to parent:', message);
    try {
      if (window && window.parent) {
        window.parent.postMessage(message, '*');
        console.log('[IframeSDK] Message sent successfully');
      } else {
        console.log('[IframeSDK] Window or parent not available');
      }
    } catch (error) {
      console.log('[IframeSDK] Error sending message to parent:', error);
      logger.error('Error sending message to parent:', error);
    }
  }

  /**
   * Find element in iframe and notify parent
   */
  private handleFindElement(elementInfo: any): void {
    console.log('[IframeSDK] === HANDLE FIND ELEMENT ===');
    console.log('[IframeSDK] Element info received:', elementInfo);
    console.log('[IframeSDK] Step ID:', elementInfo.stepId);
    console.log('[IframeSDK] Actions:', elementInfo.actions);
    console.log('[IframeSDK] Selector:', elementInfo.selector);
    
    if (!elementInfo?.selector) {
      console.log('[IframeSDK] No selector provided');
      return;
    }

    try {
      const element = this.findElementBySelector(elementInfo.selector);
      console.log('[IframeSDK] Element search result:', element);
      
      if (element) {
        console.log('[IframeSDK] Element found:', element);
        console.log('[IframeSDK] Element tag:', element.tagName);
        console.log('[IframeSDK] Element class:', element.className);
        console.log('[IframeSDK] Element id:', element.id);
        
        // Set up element interaction for step progression
        if (elementInfo.stepId) {
          console.log('[IframeSDK] Setting up element interaction with actions:', elementInfo.actions);
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
        console.log('[IframeSDK] Element not found');
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
      console.log('[IframeSDK] Error finding element:', error);
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
    console.log('[IframeSDK] === SETUP ELEMENT INTERACTION ===');
    console.log('[IframeSDK] Element:', element);
    console.log('[IframeSDK] Step ID:', stepId);
    console.log('[IframeSDK] Actions:', actions);
    console.log('[IframeSDK] Actions length:', actions?.length || 0);
    
    if (!element) {
      console.log('[IframeSDK] No element provided for interaction setup');
      return;
    }

    // Set up click listener to handle step actions
    const clickHandler = (_event: Event) => {
      console.log('[IframeSDK] === ELEMENT CLICKED ===');
      console.log('[IframeSDK] Element clicked, handling step actions:', stepId);
      console.log('[IframeSDK] Available actions:', actions);
      
      // If there are specific actions, send them to parent
      if (actions && actions.length > 0) {
        console.log('[IframeSDK] Sending actions to parent:', actions);
        const message = {
          type: 'usertour-step-action' as const,
          stepId,
          action: 'handleActions',
          data: { actions }
        };
        console.log('[IframeSDK] Message to parent:', message);
        this.sendMessageToParent(message);
      } else {
        // Default behavior: complete the step
        console.log('[IframeSDK] No specific actions, completing step');
        this.completeStep(stepId, { 
          action: 'click',
          element: element.tagName,
          timestamp: Date.now()
        });
      }
    };

    // Add click listener
    console.log('[IframeSDK] Adding click listener to element');
    element.addEventListener('click', clickHandler);
    
    // Store reference for cleanup
    (element as any).__usertour_click_handler = clickHandler;
    (element as any).__usertour_step_id = stepId;
    (element as any).__usertour_actions = actions;
    
    console.log('[IframeSDK] Click listener added to element');
    console.log('[IframeSDK] Element properties set:', {
      hasClickHandler: !!(element as any).__usertour_click_handler,
      stepId: (element as any).__usertour_step_id,
      actions: (element as any).__usertour_actions
    });
  }

  /**
   * Find element by selector in iframe
   */
  private findElementBySelector(selector: ElementSelectorPropsData): Element | null {
    console.log('[IframeSDK] === FIND ELEMENT BY SELECTOR ===');
    console.log('[IframeSDK] Selector received:', selector);
    
    if (!document) {
      console.log('[IframeSDK] Document not available');
      return null;
    }

    try {
      // Use custom selector if available
      if (selector.customSelector) {
        console.log('[IframeSDK] Using custom selector:', selector.customSelector);
        const element = document.querySelector(selector.customSelector);
        console.log('[IframeSDK] Custom selector result:', element);
        return element;
      }

      // Use first selector from selectors array
      if (selector.selectors && selector.selectors.length > 0) {
        console.log('[IframeSDK] Using first selector from array:', selector.selectors[0]);
        const element = document.querySelector(selector.selectors[0]);
        console.log('[IframeSDK] Selector array result:', element);
        return element;
      }
      
      console.log('[IframeSDK] No valid selector found');
      return null;
    } catch (error) {
      console.log('[IframeSDK] Error in findElementBySelector:', error);
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
