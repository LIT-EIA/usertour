import { ElementSelectorPropsData } from '@usertour/types';
import { finderV2 } from '@usertour-packages/finder';
import { logger } from './logger';
import { document, window } from './globals';

/**
 * Interface for iframe communication messages
 */
export interface IframeMessage {
  type: 'usertour-step-complete' | 'usertour-step-action' | 'usertour-element-found' | 'usertour-element-not-found' | 'usertour-find-element' | 'usertour-cleanup-step' | 'usertour-cleanup-all-steps';
  stepId?: string;
  action?: string;
  element?: {
    selector: ElementSelectorPropsData;
    iframeSrc: string;
    iframeIndex: number;
  } | ElementSelectorPropsData;
  actions?: any[];
  data?: any;
}

/**
 * Interface for iframe element information
 */
export interface IframeElementInfo {
  element: Element;
  iframe: HTMLIFrameElement;
  iframeSrc: string;
  iframeIndex: number;
  iframeRect: DOMRect;
}

/**
 * Interface for iframe communication handler
 */
export interface IframeCommunicationHandler {
  onStepComplete: (stepId: string, data?: any) => void;
  onStepAction: (stepId: string, action: string, data?: any) => void;
  onElementFound: (element: IframeElementInfo) => void;
  onElementNotFound: (selector: ElementSelectorPropsData) => void;
}

export interface IframeCommunicationHandlerWithId extends IframeCommunicationHandler {
  id: string; // Unique identifier for this handler
}

/**
 * Utility class for handling iframe-related operations
 */
export class IframeUtils {
  private static instance: IframeUtils;
  private communicationHandlers: Map<string, IframeCommunicationHandler> = new Map();
  private messageListener?: (event: MessageEvent) => void;

  /**
   * Get singleton instance
   */
  static getInstance(): IframeUtils {
    if (!IframeUtils.instance) {
      IframeUtils.instance = new IframeUtils();
    }
    return IframeUtils.instance;
  }

  /**
   * Set up iframe communication handler with unique ID
   */
  setCommunicationHandler(id: string, handler: IframeCommunicationHandler): void {
    this.communicationHandlers.set(id, handler);
    this.setupMessageListener();
  }

  /**
   * Remove communication handler by ID
   */
  removeCommunicationHandler(id: string): void {
    this.communicationHandlers.delete(id);
    
    // If no handlers left, remove message listener
    if (this.communicationHandlers.size === 0) {
      this.removeMessageListener();
    }
  }

  /**
   * Remove all communication handlers
   */
  removeAllCommunicationHandlers(): void {
    this.communicationHandlers.clear();
    this.removeMessageListener();
  }

  /**
   * Set up message listener for iframe communication
   */
  private setupMessageListener(): void {
    if (this.messageListener) {
      return;
    }

    this.messageListener = (event: MessageEvent) => {
      // Only process messages from iframes
      if (!event.source || event.source === window) {
        return;
      }

      try {
        const message: IframeMessage = event.data;
        
        if (!message.type || !message.type.startsWith('usertour-')) {
          return;
        }

        switch (message.type) {
          case 'usertour-step-complete':
            if (message.stepId) {
              // Call all handlers
              this.communicationHandlers.forEach((handler) => {
                handler.onStepComplete(message.stepId!, message.data);
              });
            }
            break;
          case 'usertour-step-action':
            if (message.stepId && message.action) {
              // Call all handlers
              this.communicationHandlers.forEach((handler) => {
                handler.onStepAction(message.stepId!, message.action!, message.data);
              });
            }
            break;
          case 'usertour-element-found':
            if (message.element) {
              // Find the actual element in the iframe
              const iframe = this.findIframeBySrc((message.element as any).iframeSrc, (message.element as any).iframeIndex);
              if (iframe && iframe.contentDocument) {
                const element = finderV2((message.element as any).selector, iframe.contentDocument);
                if (element) {
                  const iframeRect = iframe.getBoundingClientRect();
                  const iframeElementInfo = {
                    element,
                    iframe,
                    iframeSrc: (message.element as any).iframeSrc,
                    iframeIndex: (message.element as any).iframeIndex,
                    iframeRect,
                  };
                  
                  // Call all handlers
                  this.communicationHandlers.forEach((handler) => {
                    handler.onElementFound(iframeElementInfo);
                  });
                }
              }
            }
            break;
          case 'usertour-element-not-found':
            if (message.element) {
              // Call all handlers
              this.communicationHandlers.forEach((handler) => {
                handler.onElementNotFound((message.element as any).selector);
              });
            }
            break;
          case 'usertour-find-element':
            // This is a message from parent to iframe, handled by iframe SDK
            break;
        }
      } catch (error) {
        logger.error('Error processing iframe message:', error);
      }
    };

    if (window) {
      window.addEventListener('message', this.messageListener);
    }
  }

  /**
   * Remove message listener
   */
  private removeMessageListener(): void {
    if (this.messageListener && window) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = undefined;
    }
  }

  /**
   * Find all iframes on the page
   */
  getAllIframes(): HTMLIFrameElement[] {
    if (!document) {
      return [];
    }
    const iframes = Array.from(document.querySelectorAll('iframe'));
    return iframes;
  }

  /**
   * Find iframe by source URL and index
   */
  findIframeBySrc(src: string, index: number): HTMLIFrameElement | null {
    const iframes = this.getAllIframes();
    const matchingIframes = iframes.filter(iframe => {
      try {
        return iframe.src === src || iframe.src.includes(src);
      } catch {
        return false;
      }
    });
    
    return matchingIframes[index] || null;
  }

  /**
   * Check if an element is inside an iframe
   */
  isElementInIframe(element: Element): HTMLIFrameElement | null {
    let currentElement: Element | null = element;
    
    while (currentElement) {
      if (currentElement.tagName === 'IFRAME') {
        return currentElement as HTMLIFrameElement;
      }
      currentElement = currentElement.parentElement;
    }
    
    return null;
  }

  /**
   * Search for an element across all iframes
   */
  async searchElementInIframes(selector: ElementSelectorPropsData): Promise<IframeElementInfo | null> {
    const iframes = this.getAllIframes();
    
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      
      try {
        // Check if iframe is accessible
        if (!iframe.contentDocument) {
          continue;
        }

        // Search for element in this iframe
        const element = finderV2(selector, iframe.contentDocument);
        if (element) {
          const iframeRect = iframe.getBoundingClientRect();
          return {
            element,
            iframe,
            iframeSrc: iframe.src,
            iframeIndex: i,
            iframeRect,
          };
        }
      } catch (error) {
        // Cross-origin iframe, skip silently
      }
    }
    
    return null;
  }

  /**
   * Send message to iframe
   */
  sendMessageToIframe(iframe: HTMLIFrameElement, message: IframeMessage): void {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(message, '*');
      }
    } catch (error) {
      logger.error('Error sending message to iframe:', error);
    }
  }

  /**
   * Send cleanup message to iframe for a specific step
   */
  sendCleanupMessageToIframe(iframe: HTMLIFrameElement, stepId: string): void {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'usertour-cleanup-step',
          stepId,
        }, '*');
        
        // Also try direct cleanup as backup - clean up ALL steps to be safe
        setTimeout(() => {
          try {
            if (iframe.contentWindow && (iframe.contentWindow as any).usertourIframeSDK) {
              // Clean up the specific step first
              (iframe.contentWindow as any).usertourIframeSDK.cleanupStep(stepId);
              
              // Also clean up ALL steps to catch any missed elements
              (iframe.contentWindow as any).usertourIframeSDK.cleanupAllSteps();
            }
          } catch (error) {
            // Silently handle cleanup errors
          }
        }, 100);
      }
    } catch (error) {
      logger.error('Error sending cleanup message to iframe:', error);
    }
  }

  /**
   * Send cleanup message to all iframes to clean up all steps
   */
  sendCleanupAllStepsToAllIframes(): void {
    const iframes = this.getAllIframes();
    
    iframes.forEach((iframe) => {
      if (this.isIframeAccessible(iframe)) {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'usertour-cleanup-all-steps',
            }, '*');
          }
        } catch (error) {
          // Silently handle cleanup errors
        }
      }
    });
  }

  /**
   * Send message to all iframes
   */
  sendMessageToAllIframes(message: IframeMessage): void {
    const iframes = this.getAllIframes();
    iframes.forEach(iframe => {
      this.sendMessageToIframe(iframe, message);
    });
  }

  /**
   * Check if iframe is accessible (same-origin)
   */
  isIframeAccessible(iframe: HTMLIFrameElement): boolean {
    try {
      return !!iframe.contentDocument;
    } catch {
      return false;
    }
  }

  /**
   * Get iframe position relative to viewport
   */
  getIframePosition(iframe: HTMLIFrameElement): DOMRect {
    return iframe.getBoundingClientRect();
  }

  /**
   * Convert element position from iframe coordinates to parent coordinates
   */
  convertIframeToParentCoordinates(
    elementRect: DOMRect,
    iframeRect: DOMRect
  ): DOMRect {
    return new DOMRect(
      elementRect.left + iframeRect.left,
      elementRect.top + iframeRect.top,
      elementRect.width,
      elementRect.height
    );
  }

  /**
   * Check if iframe is visible in viewport
   */
  isIframeVisible(iframe: HTMLIFrameElement): boolean {
    const rect = this.getIframePosition(iframe);
    const viewport = {
      width: window?.innerWidth || 0,
      height: window?.innerHeight || 0,
    };

    return (
      rect.top < viewport.height &&
      rect.bottom > 0 &&
      rect.left < viewport.width &&
      rect.right > 0
    );
  }

  /**
   * Wait for iframe to load, including handling src attribute changes
   * When src changes, we need to wait for the new content to fully load
   */
  waitForIframeLoad(iframe: HTMLIFrameElement, timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let checkInterval: ReturnType<typeof setInterval> | null = null;
      let loadEventListener: (() => void) | null = null;
      let domContentLoadedListener: (() => void) | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        if (loadEventListener) {
          iframe.removeEventListener('load', loadEventListener);
          loadEventListener = null;
        }
        if (domContentLoadedListener && iframe.contentWindow) {
          try {
            iframe.contentWindow.removeEventListener('DOMContentLoaded', domContentLoadedListener);
          } catch {
            // Ignore errors for cross-origin
          }
          domContentLoadedListener = null;
        }
      };

      const checkIframeReady = (): boolean => {
        try {
          // Check if iframe is accessible
          if (!iframe.contentDocument || !iframe.contentWindow) {
            return false;
          }

          const doc = iframe.contentDocument;

          // Check if document has body (basic readiness)
          if (!doc.body) {
            return false;
          }

          // Check readyState - must be complete
          if (doc.readyState === 'complete') {
            // Additional verification: ensure the document is not empty
            // Sometimes readyState is complete but content hasn't loaded yet
            return true;
          }

          return false;
        } catch {
          // Cross-origin iframe or other error
          return false;
        }
      };

      const resolveIfReady = () => {
        // Wait a bit after load event to ensure content is fully rendered
        setTimeout(() => {
          if (checkIframeReady()) {
            cleanup();
            resolve();
          } else {
            // If not ready after load event, start polling
            startPolling();
          }
        }, 300); // Give content time to render after load event
      };

      const startPolling = () => {
        if (checkInterval) {
          return; // Already polling
        }
        
        // Poll to check if iframe content is ready
        checkInterval = setInterval(() => {
          if (checkIframeReady()) {
            cleanup();
            resolve();
          } else if (Date.now() - startTime > timeout) {
            cleanup();
            reject(new Error('Iframe load timeout'));
          }
        }, 200); // Check every 200ms
      };

      // Set up load event listener (fires when iframe finishes loading new content)
      loadEventListener = () => {
        resolveIfReady();
      };

      iframe.addEventListener('load', loadEventListener);

      // Also listen for DOMContentLoaded inside the iframe if accessible
      try {
        if (iframe.contentWindow) {
          domContentLoadedListener = () => {
            setTimeout(() => {
              if (checkIframeReady()) {
                cleanup();
                resolve();
              } else {
                // Start polling if DOMContentLoaded fired but content not fully ready
                startPolling();
              }
            }, 200);
          };

          iframe.contentWindow.addEventListener('DOMContentLoaded', domContentLoadedListener);
        }
      } catch {
        // Cross-origin, can't access contentWindow
        // Fall back to load event and polling
      }

      // If iframe is already loaded, check immediately
      // But also handle the case where src just changed and content is loading
      if (iframe.contentDocument?.readyState === 'complete') {
        // Check if this is a new load or old content
        // Wait a moment and verify it's still ready (handles src changes)
        setTimeout(() => {
          if (checkIframeReady()) {
            // Double-check: if src changed, content might be loading
            // Give it a moment and verify again
            setTimeout(() => {
              if (checkIframeReady()) {
                cleanup();
                resolve();
              } else {
                // Content might be changing, wait for load event
                startPolling();
              }
            }, 500);
          } else {
            // Content is loading, wait for load event
            startPolling();
          }
        }, 100);
      } else {
        // Content is loading, wait for load event and start polling as fallback
        startPolling();
      }

      // Set overall timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Iframe load timeout'));
      }, timeout);
    });
  }

  /**
   * Inject SDK into iframe (for same-origin iframes)
   */
  async injectSDKIntoIframe(iframe: HTMLIFrameElement): Promise<boolean> {
    try {
      if (!this.isIframeAccessible(iframe)) {
        return false;
      }

      const iframeDoc = iframe.contentDocument!;
      
      // Check if SDK is already injected
      if (iframeDoc.querySelector('script[data-usertour-sdk]')) {
        return true;
      }

      // Wait for iframe to be ready
      await this.waitForIframeLoad(iframe);

      // Create script tag to inject SDK
      const script = iframeDoc.createElement('script');
      script.setAttribute('data-usertour-sdk', 'true');
      script.textContent = `
        // Inject iframe SDK communication
        (function() {
          if (window.usertourIframeSDK) {
            return;
          }
          
          // Import the iframe SDK functionality
          ${this.getIframeSDKCode()}
          
          // Initialize the SDK
          if (window.usertourIframeSDK) {
            window.usertourIframeSDK.init();
          }
        })();
      `;
      
      iframeDoc.head.appendChild(script);
      return true;
    } catch (error) {
      logger.error('Error injecting SDK into iframe:', error);
      return false;
    }
  }

  /**
   * Get the iframe SDK code to inject
   */
  private getIframeSDKCode(): string {
    return `
      window.usertourIframeSDK = {
        init: function() {
          console.log('[IframeSDK] === INITIALIZING IFRAME SDK ===');
          console.log('[IframeSDK] Window available:', !!window);
          console.log('[IframeSDK] Window parent available:', !!(window && window.parent));
          
          if (this.messageListener) {
            console.log('[IframeSDK] Already initialized');
            return;
          }

          this.messageListener = (event) => {
            console.log('[IframeSDK] === MESSAGE RECEIVED ===');
            console.log('[IframeSDK] Event source:', event.source);
            console.log('[IframeSDK] Event origin:', event.origin);
            console.log('[IframeSDK] Event data:', event.data);
            
            // Only process messages from parent window
            if (!window || event.source !== window.parent) {
              console.log('[IframeSDK] Message not from parent, ignoring');
              console.log('[IframeSDK] Event source:', event.source);
              console.log('[IframeSDK] Window parent:', window?.parent);
              console.log('[IframeSDK] Are they equal?', event.source === window?.parent);
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
                case 'usertour-cleanup-step':
                  this.cleanupStep(message.stepId);
                  break;
                case 'usertour-cleanup-all-steps':
                  this.cleanupAllSteps();
                  break;
              }
            } catch (error) {
              console.log('[IframeSDK] Error handling message:', error);
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
        },
        
        handleFindElement: function(elementInfo) {
          console.log('[IframeSDK] === HANDLE FIND ELEMENT ===');
          console.log('[IframeSDK] Element info received:', elementInfo);
          console.log('[IframeSDK] Step ID:', elementInfo.stepId);
          console.log('[IframeSDK] Actions:', elementInfo.actions);
          console.log('[IframeSDK] Selector:', elementInfo.element);
          
          if (!elementInfo?.element) {
            console.log('[IframeSDK] No element selector provided');
            return;
          }

          try {
            const element = this.findElementBySelector(elementInfo.element);
            console.log('[IframeSDK] Element search result:', element);
            
            if (element) {
              console.log('[IframeSDK] Element found:', element);
              console.log('[IframeSDK] Element tag:', element.tagName);
              console.log('[IframeSDK] Element class:', element.className);
              console.log('[IframeSDK] Element id:', element.id);
              
              // Set up element interaction for step progression
              if (elementInfo.stepId) {
                // Set up trigger monitoring if triggers are provided
                if (elementInfo.triggers && elementInfo.triggers.length > 0) {
                  console.log('[IframeSDK] Setting up trigger monitoring:', elementInfo.triggers);
                  console.log('[IframeSDK] Triggers detected - deferring element click handler setup to allow trigger testing');
                  this.setupTriggerMonitoring(elementInfo.stepId, elementInfo.triggers, elementInfo.actions, element, elementInfo.element);
                } else {
                  // Only set up immediate click handler if there are no triggers
                  // This allows triggers to be tested without click interference
                  console.log('[IframeSDK] No triggers - setting up immediate element interaction with actions:', elementInfo.actions);
                  this.setupElementInteraction(element, elementInfo.stepId, elementInfo.actions, elementInfo.element);
                }
              }
              
              // Don't send usertour-element-found back to parent because the parent already found the element
              // The parent found the element through the element watcher, so this is redundant
              console.log('[IframeSDK] Element interaction set up successfully, not sending element-found message');
            } else {
              console.log('[IframeSDK] Element not found');
              // Only send not-found if the element truly doesn't exist
              this.sendMessageToParent({
                type: 'usertour-element-not-found',
                element: {
                  selector: elementInfo.element,
                  iframeSrc: window?.location?.href || '',
                  iframeIndex: 0,
                },
              });
            }
          } catch (error) {
            console.log('[IframeSDK] Error finding element:', error);
            this.sendMessageToParent({
              type: 'usertour-element-not-found',
              element: {
                selector: elementInfo.element,
                iframeSrc: window?.location?.href || '',
                iframeIndex: 0,
              },
            });
          }
        },
        
        setupElementInteraction: function(element, stepId, actions, selector) {
          console.log('[IframeSDK] === SETUP ELEMENT INTERACTION ===');
          console.log('[IframeSDK] Element:', element);
          console.log('[IframeSDK] Step ID:', stepId);
          console.log('[IframeSDK] Actions:', actions);
          console.log('[IframeSDK] Actions length:', actions?.length || 0);
          console.log('[IframeSDK] Selector:', selector);
          
          if (!element) {
            console.log('[IframeSDK] No element provided for interaction setup');
            return;
          }
          
          // Helper function to check if an element matches the selector
          const elementMatchesSelector = function(el, sel) {
            if (!el || !sel) {
              return false;
            }
            
            try {
              // Check custom selector first
              if (sel.customSelector) {
                try {
                  const matches = el.matches && el.matches(sel.customSelector);
                  if (matches) {
                    return true;
                  }
                } catch (e) {
                  console.log('[IframeSDK] Error matching customSelector:', e);
                }
              }
              
              // Check selectors array
              if (sel.selectors && sel.selectors.length > 0) {
                for (let i = 0; i < sel.selectors.length; i++) {
                  try {
                    if (el.matches && el.matches(sel.selectors[i])) {
                      return true;
                    }
                  } catch (e) {
                    console.log('[IframeSDK] Error matching selector:', sel.selectors[i], e);
                  }
                }
              }
            } catch (e) {
              console.log('[IframeSDK] Error in elementMatchesSelector:', e);
            }
            
            return false;
          };

          // Set up click listener to handle step actions
          // Listen at document level in capture phase to catch events before any link handlers
          // This ensures we catch the event even if link handlers call preventDefault() or stopPropagation()
          let hasHandled = false;
          const clickHandler = (event) => {
            // Check if the clicked element is our target element or a descendant
            const target = event.target;
            if (!target) {
              console.log('[IframeSDK] No target in event');
              return;
            }
            
            console.log('[IframeSDK] Document-level event caught:', {
              type: event.type,
              target: target,
              targetTag: target.tagName,
              targetId: target.id,
              targetClass: target.className,
              targetHref: target.href || target.getAttribute('href') || 'N/A',
              element: element,
              elementTag: element.tagName,
              elementId: element.id,
              elementClass: element.className,
              elementHref: element.href || element.getAttribute('href') || 'N/A'
            });
            
            // Check if target is the element itself or a descendant
            let isTargetOrDescendant = false;
            const directMatch = target === element;
            const containsMatch = element.contains && element.contains(target);
            
            // Also check if the clicked element matches the selector (in case the element found is a container)
            const selectorMatch = selector && elementMatchesSelector(target, selector);
            
            console.log('[IframeSDK] Matching check:', {
              directMatch: directMatch,
              containsMatch: containsMatch,
              selectorMatch: selectorMatch,
              elementContains: typeof element.contains === 'function' ? 'function exists' : 'no contains method'
            });
            
            if (directMatch) {
              isTargetOrDescendant = true;
              console.log('[IframeSDK] Target matches element directly');
            } else if (containsMatch) {
              isTargetOrDescendant = true;
              console.log('[IframeSDK] Target is descendant of element');
            } else if (selectorMatch) {
              isTargetOrDescendant = true;
              console.log('[IframeSDK] Target matches the selector');
            } else {
              // Also check if target is an ancestor (in case element is inside the link)
              let current = element;
              let ancestorLevel = 0;
              while (current && current !== document.body && ancestorLevel < 10) {
                if (current === target) {
                  isTargetOrDescendant = true;
                  console.log('[IframeSDK] Element is descendant of target at level', ancestorLevel);
                  break;
                }
                current = current.parentElement;
                ancestorLevel++;
              }
              if (!isTargetOrDescendant) {
                console.log('[IframeSDK] Checked ancestors up to level', ancestorLevel, '- no match');
              }
            }
            
            if (!isTargetOrDescendant) {
              console.log('[IframeSDK] Target does not match element, ignoring');
              console.log('[IframeSDK] Full element comparison:', {
                targetNode: target,
                elementNode: element,
                targetOuterHTML: target.outerHTML ? target.outerHTML.substring(0, 200) : 'N/A',
                elementOuterHTML: element.outerHTML ? element.outerHTML.substring(0, 200) : 'N/A'
              });
              return;
            }
            
            // Prevent duplicate handling
            if (hasHandled) {
              console.log('[IframeSDK] Already handled this click, ignoring duplicate');
              return;
            }
            hasHandled = true;
            
            console.log('[IframeSDK] === ELEMENT CLICKED ===');
            console.log('[IframeSDK] Event type:', event.type);
            console.log('[IframeSDK] Target:', target);
            console.log('[IframeSDK] Element:', element);
            console.log('[IframeSDK] Element clicked, handling step actions:', stepId);
            console.log('[IframeSDK] Available actions:', actions);
            
            // Reset flag after a short delay to allow for future clicks
            setTimeout(() => {
              hasHandled = false;
            }, 100);
            
            // If there are specific actions, send them to parent
            if (actions && actions.length > 0) {
              console.log('[IframeSDK] Sending actions to parent:', actions);
              const message = {
                type: 'usertour-step-action',
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

          // Listen at document level in capture phase for both mousedown and click
          // This ensures we catch events before any link handlers can interfere
          console.log('[IframeSDK] Adding document-level mousedown listener (capture phase)');
          if (document) {
            document.addEventListener('mousedown', clickHandler, true);
          }
          
          // Also add click listener as fallback
          console.log('[IframeSDK] Adding document-level click listener (capture phase) as fallback');
          if (document) {
            document.addEventListener('click', clickHandler, true);
          }
          
          // Store references for cleanup
          element.__usertour_click_handler = clickHandler;
          element.__usertour_click_handler_capture = true;
          element.__usertour_step_id = stepId;
          element.__usertour_actions = actions;
          element.__usertour_selector = selector;
          
          console.log('[IframeSDK] Click listener added to element');
          console.log('[IframeSDK] Element properties set:', {
            hasClickHandler: !!element.__usertour_click_handler,
            stepId: element.__usertour_step_id,
            actions: element.__usertour_actions
          });
          
          // Add a debug property to track when this was set up
          element.__usertour_setup_time = Date.now();
          console.log('[IframeSDK] Element setup completed at:', element.__usertour_setup_time);
        },
        
        findElementBySelector: function(selector) {
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
            return null;
          }
        },
        
        sendMessageToParent: function(message) {
          console.log('[IframeSDK] Sending message to parent:', message);
          try {
            if (window && window.parent) {
              window.parent.postMessage(message, '*');
            }
          } catch (error) {
            console.log('[IframeSDK] Error sending message to parent:', error);
          }
        },
        
        completeStep: function(stepId, data) {
          this.sendMessageToParent({
            type: 'usertour-step-complete',
            stepId,
            data,
          });
        },
        
        handleStepAction: function(stepId, action, data) {
          console.log('[IframeSDK] Handling step action:', stepId, action, data);
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
              console.log('[IframeSDK] Unknown step action:', action);
          }
        },
        
        nextStep: function(stepId, data) {
          this.sendMessageToParent({
            type: 'usertour-step-action',
            stepId,
            action: 'next',
            data,
          });
        },
        
        previousStep: function(stepId, data) {
          this.sendMessageToParent({
            type: 'usertour-step-action',
            stepId,
            action: 'previous',
            data,
          });
        },
        
        skipStep: function(stepId, data) {
          this.sendMessageToParent({
            type: 'usertour-step-action',
            stepId,
            action: 'skip',
            data,
          });
        },
        
        // ===== TRIGGER EVALUATION AND MONITORING =====
        
        // Helper: Parse URL pattern for matching
        parseUrlPattern: function(url) {
          const urlPatterns = url.match(/^(([a-z\\d]+):\\/\\/)?([^/?#]+)?(\\/[^?#]*)?(\\?([^#]*))?(#.*)?$/i);
          if (!urlPatterns) {
            return null;
          }
          const [, , scheme = '', domain = '', path = '', , query = '', fragment = ''] = urlPatterns;
          return { scheme, domain, path, query, fragment };
        },
        
        replaceSpecialWords: function(str) {
          return str.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
        },
        
        replaceWildcard: function(input, s1, s2) {
          const withSpecialWords = this.replaceSpecialWords(input);
          const withWildcard = withSpecialWords.replace(/\\\\\\*/g, s1 + '*');
          if (!s2) {
            return withWildcard;
          }
          return withWildcard.replace(/:[a-z0-9_]+/g, '[^' + s2 + ']+');
        },
        
        parsePattern: function(pattern) {
          if (!pattern || !pattern.trim()) {
            return null;
          }
          const _pattern = this.parseUrlPattern(pattern);
          if (!_pattern) {
            console.error('[IframeSDK] Invalid URL pattern:', pattern);
            return null;
          }
          const { scheme, domain, path, query, fragment } = _pattern;
          const _scheme = scheme ? this.replaceSpecialWords(scheme) : '[a-z\\\\d]+';
          const _domain = domain ? this.replaceWildcard(domain, '[^/]', '.') : '[^/]*';
          const _fragment = fragment ? this.replaceWildcard(fragment, '.', '/') : '(#.*)?';
          const _path = path ? this.replaceWildcard(path, '[^?#]', '/') : '/[^?#]*';
          let _query = '(\\\\?[^#]*)?';
          if (query) {
            const params = new URLSearchParams(query);
            params.forEach((value, key) => {
              const _str = value === '' ? '=?' : value === '*' ? '(=[^&#]*)?' : '=' + this.replaceWildcard(value, '[^#]');
              _query += '(?=.*[?&]' + this.replaceSpecialWords(key) + _str + '([&#]|$))';
            });
            _query += '\\\\?[^#]*';
          }
          try {
            return new RegExp('^' + _scheme + '://' + _domain + '(:\\\\d+)?' + _path + _query + _fragment + '$');
          } catch (e) {
            console.error('[IframeSDK] Error creating regex:', e);
            return null;
          }
        },
        
        isMatchUrlPattern: function(url, includes, excludes) {
          const isMatchIncludes = includes && includes.length > 0
            ? includes.some((include) => {
                const reg = this.parsePattern(include);
                return reg ? reg.test(url) : false;
              })
            : true;
          const isMatchExcludes = excludes && excludes.length > 0
            ? excludes.some((exclude) => {
                const reg = this.parsePattern(exclude);
                return reg ? reg.test(url) : false;
              })
            : false;
          return isMatchIncludes && !isMatchExcludes;
        },
        
        findElementBySelectorData: function(elementData) {
          if (!document) {
            return null;
          }
          try {
            if (elementData.customSelector) {
              return document.querySelector(elementData.customSelector);
            }
            if (elementData.selectors && elementData.selectors.length > 0) {
              return document.querySelector(elementData.selectors[0]);
            }
          } catch (e) {
            console.error('[IframeSDK] Error finding element:', e);
          }
          return null;
        },
        
        isElementVisible: function(el) {
          if (!el || !document?.body) {
            return false;
          }
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
          );
        },
        
        clickedCache: new Map(),
        
        isElementClicked: function(el) {
          if (this.clickedCache.has(el)) {
            return this.clickedCache.get(el);
          }
          const onClick = () => {
            this.clickedCache.set(el, true);
            el.removeEventListener('click', onClick);
          };
          el.addEventListener('click', onClick);
          this.clickedCache.set(el, false);
          return false;
        },
        
        // Evaluate condition by type
        evaluateCondition: async function(condition) {
          if (!condition || !condition.type) {
            return condition?.actived || false;
          }
          
          switch (condition.type) {
            case 'current-page': {
              const { excludes, includes } = condition.data || {};
              const href = window.location?.href || '';
              return this.isMatchUrlPattern(href, includes || [], excludes || []);
            }
            
            case 'time': {
              const { endDate, endDateHour, endDateMinute, startDate, startDateHour, startDateMinute } = condition.data || {};
              if (!startDate) {
                return false;
              }
              const startTime = new Date(startDate + ' ' + (startDateHour || '00') + ':' + (startDateMinute || '00') + ':00');
              const now = new Date();
              if (!endDate) {
                return now >= startTime;
              }
              const endTime = new Date(endDate + ' ' + (endDateHour || '23') + ':' + (endDateMinute || '59') + ':00');
              return now >= startTime && now <= endTime;
            }
            
            case 'element': {
              const { elementData, logic } = condition.data || {};
              if (!elementData) {
                return false;
              }
              const el = this.findElementBySelectorData(elementData);
              if (!el) {
                return logic === 'unpresent';
              }
              
              const isPresent = this.isElementVisible(el);
              const isDisabled = el.disabled || false;
              
              switch (logic) {
                case 'present':
                  return isPresent;
                case 'unpresent':
                  return !isPresent;
                case 'disabled':
                  return isDisabled;
                case 'undisabled':
                  return !isDisabled;
                case 'clicked':
                  return this.isElementClicked(el);
                case 'unclicked':
                  return !this.isElementClicked(el);
                default:
                  return false;
              }
            }
            
            case 'text-input': {
              const { elementData, logic, value } = condition.data || {};
              if (!elementData) {
                return false;
              }
              const el = this.findElementBySelectorData(elementData);
              if (!el || el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
                return false;
              }
              const elValue = el.value || '';
              
              switch (logic) {
                case 'is':
                  return elValue === value;
                case 'not':
                  return elValue !== value;
                case 'contains':
                  return elValue.includes(value);
                case 'notContain':
                  return !elValue.includes(value);
                case 'startsWith':
                  return elValue.startsWith(value);
                case 'endsWith':
                  return elValue.endsWith(value);
                case 'match':
                  try {
                    return new RegExp(value).test(elValue);
                  } catch {
                    return false;
                  }
                case 'unmatch':
                  try {
                    return !new RegExp(value).test(elValue);
                  } catch {
                    return true;
                  }
                case 'any':
                  return true;
                case 'empty':
                  return !elValue;
                default:
                  return false;
              }
            }
            
            case 'text-fill': {
              const { elementData } = condition.data || {};
              if (!elementData) {
                return false;
              }
              const el = this.findElementBySelectorData(elementData);
              if (!el || el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
                return false;
              }
              
              // Check if element has been filled (value changed from initial value)
              const cacheKey = '__usertour_fill_' + condition.id;
              if (el[cacheKey]) {
                return el[cacheKey].isActive;
              }
              
              // Set up monitoring for fill
              const initialValue = el.value || '';
              let lastTimestamp = Date.now();
              let isActive = false;
              
              const onKeyup = () => {
                lastTimestamp = Date.now();
              };
              
              const checkFill = () => {
                const now = Date.now();
                if (now - lastTimestamp > 1000 && el.value !== initialValue) {
                  isActive = true;
                  el.removeEventListener('keyup', onKeyup);
                  el[cacheKey] = { isActive: true, timestamp: now };
                  return true;
                }
                el[cacheKey] = { isActive: false, timestamp: lastTimestamp };
                return false;
              };
              
              el.addEventListener('keyup', onKeyup);
              el[cacheKey] = { isActive: false, timestamp: lastTimestamp };
              
              // Check immediately
              setTimeout(checkFill, 1100);
              return false;
            }
            
            case 'group':
              // Recursively evaluate group conditions
              if (condition.conditions && condition.conditions.length > 0) {
                const operator = condition.operators || 'and';
                const results = await Promise.all(
                  condition.conditions.map(async (cond) => await this.evaluateCondition(cond))
                );
                const actives = results.filter((r) => r === true);
                return operator === 'and' ? actives.length === results.length : actives.length > 0;
              }
              return false;
            
            default:
              // For other types (user-attr, content, etc.), rely on pre-evaluated actived flag
              return condition.actived || false;
          }
        },
        
        // Evaluate all conditions in a trigger
        evaluateTriggerConditions: async function(conditions) {
          if (!conditions || conditions.length === 0) {
            return false;
          }
          
          const operator = conditions[0]?.operators || 'and';
          const results = await Promise.all(
            conditions.map(async (cond) => await this.evaluateCondition(cond))
          );
          const actives = results.filter((r) => r === true);
          
          return operator === 'and' ? actives.length === results.length : actives.length > 0;
        },
        
        // Store active trigger monitors
        triggerMonitors: new Map(),
        
        // Set up trigger monitoring for a step
        setupTriggerMonitoring: function(stepId, triggers, elementActions, element, elementSelector) {
          console.log('[IframeSDK] === SETUP TRIGGER MONITORING ===');
          console.log('[IframeSDK] Step ID:', stepId);
          console.log('[IframeSDK] Triggers:', triggers);
          console.log('[IframeSDK] Element actions (will be used as fallback):', elementActions);
          
          // Clean up any existing monitors for this step
          this.stopTriggerMonitoring(stepId);
          
          const monitors = [];
          let hasActiveTriggers = false;
          
          triggers.forEach((trigger, index) => {
            if (!trigger.conditions || trigger.conditions.length === 0) {
              return;
            }
            
            hasActiveTriggers = true;
            
            const checkInterval = setInterval(async () => {
              try {
                const isActive = await this.evaluateTriggerConditions(trigger.conditions);
                
                if (isActive) {
                  // Clear the interval
                  clearInterval(checkInterval);
                  
                  // Execute actions with optional wait time
                  const waitTime = Math.min(trigger.wait || 0, 300) * 1000;
                  
                  setTimeout(() => {
                    // Use trigger actions if available, otherwise fall back to element actions
                    const actionsToExecute = trigger.actions && trigger.actions.length > 0 
                      ? trigger.actions 
                      : elementActions;
                    
                    if (actionsToExecute && actionsToExecute.length > 0) {
                      this.executeTriggerActions(stepId, actionsToExecute);
                    } else {
                      console.log('[IframeSDK] No actions to execute for trigger', index);
                    }
                  }, waitTime);
                  
                  // Remove from monitors
                  const monitorIndex = monitors.indexOf(checkInterval);
                  if (monitorIndex > -1) {
                    monitors.splice(monitorIndex, 1);
                  }
                }
              } catch (error) {
                console.error('[IframeSDK] Error evaluating trigger:', error);
              }
            }, 500); // Check every 500ms
            
            monitors.push(checkInterval);
          });
          
          // Store monitors for cleanup
          this.triggerMonitors.set(stepId, monitors);
          console.log('[IframeSDK] Trigger monitoring set up for', monitors.length, 'triggers');
          console.log('[IframeSDK] Element click handler NOT set up - triggers will be evaluated first');
          
          // If no active triggers were found, set up element click handler as fallback
          if (!hasActiveTriggers && elementActions && elementActions.length > 0) {
            console.log('[IframeSDK] No active triggers found, setting up element click handler');
            if (element) {
              this.setupElementInteraction(element, stepId, elementActions, elementSelector);
            } else if (elementSelector) {
              const foundElement = this.findElementBySelector(elementSelector);
              if (foundElement) {
                this.setupElementInteraction(foundElement, stepId, elementActions, elementSelector);
              }
            }
          }
        },
        
        // Stop trigger monitoring for a step
        stopTriggerMonitoring: function(stepId) {
          const monitors = this.triggerMonitors.get(stepId);
          if (monitors) {
            monitors.forEach((interval) => clearInterval(interval));
            this.triggerMonitors.delete(stepId);
            console.log('[IframeSDK] Stopped trigger monitoring for step', stepId);
          }
        },
        
        // Execute trigger actions (send to parent for handling)
        // All action types are supported:
        // - STEP_GOTO: Navigate to another step
        // - FLOW_DISMIS: Dismiss the current flow
        // - FLOW_START: Start a new flow/checklist
        // - PAGE_NAVIGATE: Navigate to a page
        // - JAVASCRIPT_EVALUATE: Evaluate JavaScript code (executes in parent window context)
        executeTriggerActions: function(stepId, actions) {
          console.log('[IframeSDK] === EXECUTING TRIGGER ACTIONS ===');
          console.log('[IframeSDK] Step ID:', stepId);
          console.log('[IframeSDK] Actions:', actions);
          console.log('[IframeSDK] Actions count:', actions?.length || 0);
          
          if (!actions || actions.length === 0) {
            console.log('[IframeSDK] No actions to execute');
            return;
          }
          
          // Log each action type for debugging
          actions.forEach((action, index) => {
            console.log('[IframeSDK] Action', index + ':', {
              type: action.type,
              data: action.data
            });
          });
          
          // Send actions to parent for execution (parent handles all action types)
          // The parent's handleActions() method supports:
          // - STEP_GOTO: Calls show() with stepCvid
          // - FLOW_START: Calls startNewContent() 
          // - FLOW_DISMIS: Calls handleClose()
          // - PAGE_NAVIGATE: Calls handleNavigate()
          // - JAVASCRIPT_EVALUATE: Calls evalCode() in parent window context
          this.sendMessageToParent({
            type: 'usertour-step-action',
            stepId,
            action: 'handleActions',
            data: { actions }
          });
          
          console.log('[IframeSDK] Trigger actions sent to parent for execution');
        },
        
        cleanupStep: function(stepId) {
          // Stop trigger monitoring for this step
          this.stopTriggerMonitoring(stepId);
          
          // Find all elements with this step ID and remove their event listeners
          const elements = document.querySelectorAll('*');
          
          elements.forEach(element => {
            if (element.__usertour_step_id === stepId) {
              if (element.__usertour_click_handler && document) {
                // Remove document-level listeners with the same capture flag
                const useCapture = element.__usertour_click_handler_capture === true;
                document.removeEventListener('mousedown', element.__usertour_click_handler, useCapture);
                document.removeEventListener('click', element.__usertour_click_handler, useCapture);
              }
              
              // Clear the properties
              delete element.__usertour_click_handler;
              delete element.__usertour_click_handler_capture;
              delete element.__usertour_step_id;
              delete element.__usertour_actions;
            }
          });
        },
        
        // Store cleanup function globally for direct access
        cleanupAllSteps: function() {
          // Stop all trigger monitors
          if (this.triggerMonitors) {
            this.triggerMonitors.forEach((monitors, stepId) => {
              this.stopTriggerMonitoring(stepId);
            });
          }
          
          const elements = document.querySelectorAll('*');
          
          elements.forEach(element => {
            if (element.__usertour_step_id) {
              if (element.__usertour_click_handler && document) {
                // Remove document-level listeners with the same capture flag
                const useCapture = element.__usertour_click_handler_capture === true;
                document.removeEventListener('mousedown', element.__usertour_click_handler, useCapture);
                document.removeEventListener('click', element.__usertour_click_handler, useCapture);
              }
              delete element.__usertour_click_handler;
              delete element.__usertour_click_handler_capture;
              delete element.__usertour_step_id;
              delete element.__usertour_actions;
            }
          });
        }
      };
    `;
  }
}

/**
 * Export singleton instance
 */
export const iframeUtils = IframeUtils.getInstance();
