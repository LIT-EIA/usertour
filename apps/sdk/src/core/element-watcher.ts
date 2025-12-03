import { isVisibleNode } from '@usertour-packages/dom';
import { finderV2 } from '@usertour-packages/finder';
import { ElementSelectorPropsData } from '@usertour/types';
import { isVisible } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { Evented } from './evented';
import { DEFAULT_TARGET_MISSING_SECONDS } from './common';
import { iframeUtils, IframeElementInfo } from '../utils/iframe-utils';
import {
  parseSelectorWithCondition,
  checkConditionalSelectorPresent,
  ParsedSelector,
} from '../utils/selector-parser';

/**
 * Interface to track element visibility state
 */
type CheckContentIsVisible = {
  isHidden: boolean;
  startHiddenTs: number;
  checkHiddenTs: number;
  isTimeout: boolean;
};

// Constants for element watching configuration
const RETRY_LIMIT = 30; // Maximum number of retry attempts
const RETRY_DELAY = 200; // Delay between retries in milliseconds

/**
 * ElementWatcher class for monitoring DOM elements
 * Handles element finding, visibility checking, and timeout management
 */
export class ElementWatcher extends Evented {
  private target: ElementSelectorPropsData; // Target element selector data
  private parsedSelector: ParsedSelector; // Parsed selector with main and conditional parts
  private timer: NodeJS.Timeout | null = null; // Timer for retry mechanism
  private element: Element | null = null; // Reference to the found element
  private checker: CheckContentIsVisible | null = null; // Visibility state tracker
  private targetMissingSeconds = DEFAULT_TARGET_MISSING_SECONDS; // Time allowed for target element to be missing
  private iframeElementInfo: IframeElementInfo | null = null; // Iframe element information if found in iframe
  private isSearchingIframes = false; // Prevent multiple concurrent iframe searches
  private hasFoundElement = false; // Prevent multiple element found events
  private iframeSearchDisabled = false; // Temporarily disable iframe search to prevent rapid re-searches
  private iframeMonitor: MutationObserver | null = null; // Monitor iframes for src changes
  private lastIframeSearchTime = 0; // Track when we last searched iframes
  private iframeSearchRetryInterval = 2000; // Retry iframe search every 2 seconds if element not found

  constructor(target: ElementSelectorPropsData) {
    super();
    this.target = target;
    this.parsedSelector = parseSelectorWithCondition(target);
  }

  /**
   * Sets the time allowed for target element to be missing
   * @param seconds - Time in seconds
   */
  setTargetMissingSeconds(seconds: number) {
    this.targetMissingSeconds = seconds;
  }

  /**
   * Attempts to find the target element in the DOM
   * @param retryTimes Current number of retry attempts
   */
  async findElement(retryTimes = 0): Promise<void> {
    this.clearTimer();

    // AGGRESSIVE GUARD: If we already found an element, don't search again
    if (this.hasFoundElement) {
      console.log('[ElementWatcher] Element already found, skipping ALL searches');
      return;
    }

    if (retryTimes >= RETRY_LIMIT || retryTimes * RETRY_DELAY > this.targetMissingSeconds * 1000) {
      console.log('[ElementWatcher] Element search timeout after', retryTimes, 'retries');
      this.trigger(AppEvents.ELEMENT_FOUND_TIMEOUT);
      return;
    }

    if (!this.isDocumentReady() || !document?.body) {
      console.log('[ElementWatcher] Document not ready, scheduling retry', retryTimes);
      this.scheduleRetry(retryTimes);
      return;
    }

    // Check conditional selector if present
    if (this.parsedSelector.conditionalSelector) {
      console.log('[ElementWatcher] Checking conditional selector:', this.parsedSelector.conditionalSelector);
      const isConditionMet = await checkConditionalSelectorPresent(
        this.parsedSelector.conditionalSelector,
      );
      if (!isConditionMet) {
        console.log('[ElementWatcher] Conditional selector not present, scheduling retry', retryTimes);
        this.scheduleRetry(retryTimes);
        return;
      }
      console.log('[ElementWatcher] Conditional selector is present, proceeding with element search');
    }

    // First try to find element in main document
    console.log('[ElementWatcher] Searching for element in main document:', this.parsedSelector.mainSelector);
    const el = this.findVisibleElementBySelector();
    if (el) {
      console.log('[ElementWatcher] Element found in main document:', el);
      this.element = el;
      this.iframeElementInfo = null;
      this.hasFoundElement = true;
      // Reset search context since element was found in main document
      // This optimizes future searches to check main document first
      iframeUtils.resetSearchContext();
      this.trigger(AppEvents.ELEMENT_FOUND, el);
      return;
    }

    console.log('[ElementWatcher] Element not found in main document, searching iframes...');
    // If not found in main document, search in iframes
    // Allow periodic re-searches to catch iframe src changes
    const now = Date.now();
    const timeSinceLastIframeSearch = now - this.lastIframeSearchTime;
    
    if (!this.iframeSearchDisabled || timeSinceLastIframeSearch >= this.iframeSearchRetryInterval) {
      // Reset the disabled flag if enough time has passed
      if (timeSinceLastIframeSearch >= this.iframeSearchRetryInterval) {
        this.iframeSearchDisabled = false;
        this.lastIframeSearchTime = now;
      }
      await this.searchInIframes(retryTimes);
    } else {
      console.log('[ElementWatcher] Iframe search recently attempted, scheduling retry');
      this.scheduleRetry(retryTimes);
    }
    
    // Start monitoring iframes for src changes if not already monitoring
    if (!this.iframeMonitor && !this.hasFoundElement) {
      this.startIframeMonitoring();
    }
  }

  /**
   * Checks if the found element is currently visible
   * @returns Object containing visibility state and timeout status
   */
  async checkVisibility(): Promise<{ isHidden: boolean; isTimeout: boolean }> {
    if (!this.element) {
      return { isHidden: true, isTimeout: false };
    }

    // Check if the element is still in the current DOM tree and is the correct target
    // This handles SPA page changes where the element might have been removed or changed
    if (!this.isElementValid()) {
      // Try to find the element again with the same selector, but only look for visible ones
      const el = this.findVisibleElementBySelector();
      if (el) {
        // Found a new visible element that matches our selector
        this.element = el;
        this.iframeElementInfo = null;
        // Reset search context since element was found in main document
        iframeUtils.resetSearchContext();
        this.trigger(AppEvents.ELEMENT_CHANGED, el);
      } else {
        // Try searching in iframes again (only if not already found)
        if (!this.hasFoundElement) {
          await this.searchInIframes(0);
        }
      }
    }

    // For iframe elements, check if iframe is still visible
    if (this.iframeElementInfo) {
      const iframeVisible = iframeUtils.isIframeVisible(this.iframeElementInfo.iframe);
      if (!iframeVisible) {
        const now = Date.now();
        this.updateChecker(true, now);
        return {
          isHidden: true,
          isTimeout: this.checker?.isTimeout || false,
        };
      }
      
      // Also check if element is in a hidden section within the iframe
      try {
        const iframeDoc = this.iframeElementInfo.iframe.contentDocument;
        if (iframeDoc) {
          // Use the iframe-specific visibility check
          const isHiddenInIframe = iframeUtils.isElementInHiddenSectionInIframe(
            this.element,
            iframeDoc
          );
          if (isHiddenInIframe) {
            const now = Date.now();
            this.updateChecker(true, now);
            return {
              isHidden: true,
              isTimeout: this.checker?.isTimeout || false,
            };
          }
        }
      } catch (error) {
        // If we can't access iframe document, continue with main document check
      }
    }

    // Check if element is in a hidden section using our visibility check (for main document)
    if (!this.iframeElementInfo && iframeUtils.isElementInHiddenSection(this.element)) {
      const now = Date.now();
      this.updateChecker(true, now);
      return {
        isHidden: true,
        isTimeout: this.checker?.isTimeout || false,
      };
    }

    const isHidden =
      !isVisibleNode(this.element as HTMLElement) ||
      !(await this.checkElementVisibilityInContext(this.element as HTMLElement));

    if (!isHidden) {
      this.checker = null;
      return { isHidden: false, isTimeout: false };
    }

    const now = Date.now();
    this.updateChecker(isHidden, now);

    return {
      isHidden: true,
      isTimeout: this.checker?.isTimeout || false,
    };
  }

  /**
   * Searches for the target element in iframes
   * @param retryTimes Current number of retry attempts
   */
  private async searchInIframes(retryTimes: number): Promise<void> {
    // ULTRA-AGGRESSIVE GUARD: Block ALL iframe searches if element already found
    if (this.hasFoundElement) {
      console.log('[ElementWatcher] Element already found, skipping iframe search');
      console.trace('[ElementWatcher] Stack trace for repeated call:');
      return;
    }

    // Prevent multiple concurrent iframe searches
    if (this.isSearchingIframes) {
      console.log('[ElementWatcher] Already searching iframes, skipping');
      return;
    }

    // Prevent iframe search if already attempted
    if (this.iframeSearchDisabled) {
      console.log('[ElementWatcher] Iframe search already attempted, skipping');
      return;
    }
    
    this.isSearchingIframes = true;
    this.iframeSearchDisabled = true; // Temporarily disable to prevent rapid re-searches
    this.lastIframeSearchTime = Date.now(); // Track when we searched
    console.log('[ElementWatcher] Starting iframe search for:', this.parsedSelector.mainSelector);
    try {
      const iframeElementInfo = await iframeUtils.searchElementInIframes(
        this.parsedSelector.mainSelector,
      );
      
      if (iframeElementInfo) {
        // Double-check iframe visibility before triggering ELEMENT_FOUND
        // (iframe might have become hidden between search and trigger)
        if (!iframeUtils.isIframeCSSVisible(iframeElementInfo.iframe)) {
          console.log('[ElementWatcher] Element found in iframe but iframe is now hidden, skipping');
          // Continue searching - iframe might become visible later
          this.scheduleRetry(retryTimes);
          return;
        }
        
        console.log('[ElementWatcher] Element found in iframe:', iframeElementInfo);
        this.element = iframeElementInfo.element;
        this.iframeElementInfo = iframeElementInfo;
        this.hasFoundElement = true;
        this.trigger(AppEvents.ELEMENT_FOUND, iframeElementInfo.element);
        return;
      } else {
        console.log('[ElementWatcher] Element not found in any iframe');
      }
    } catch (error) {
      console.log('[ElementWatcher] Error during iframe search:', error);
      // If iframe search fails, continue with normal retry logic
    } finally {
      this.isSearchingIframes = false;
    }

    // If not found in iframes either, schedule retry
    console.log('[ElementWatcher] Scheduling retry', retryTimes + 1);
    this.scheduleRetry(retryTimes);
  }

  /**
   * Gets iframe element information if element is in iframe
   */
  getIframeElementInfo(): IframeElementInfo | null {
    return this.iframeElementInfo;
  }

  /**
   * Checks if the current element is in an iframe
   */
  isElementInIframe(): boolean {
    return !!this.iframeElementInfo;
  }

  /**
   * Schedules the next retry attempt to find the element
   * @param retryTimes Current number of retry attempts
   */
  private scheduleRetry(retryTimes: number) {
    // Don't schedule retry if element already found
    if (this.hasFoundElement) {
      console.log('[ElementWatcher] Element already found, skipping retry');
      return;
    }
    
    this.timer = setTimeout(() => {
      this.findElement(retryTimes + 1).catch((error) => {
        console.error('[ElementWatcher] Error in findElement retry:', error);
      });
    }, RETRY_DELAY);
  }

  /**
   * Resets the element watcher state
   * Useful when SPA navigation occurs and we want to start fresh
   */
  reset(): void {
    this.stopIframeMonitoring();
    this.clearTimer();
    this.element = null;
    this.checker = null;
    this.iframeElementInfo = null;
    this.isSearchingIframes = false;
    this.hasFoundElement = false;
    this.iframeSearchDisabled = false;
    this.lastIframeSearchTime = 0;
    // Re-parse selector in case target was updated
    this.parsedSelector = parseSelectorWithCondition(this.target);
  }

  /**
   * Starts monitoring iframes for src attribute changes
   * This allows us to detect when iframe content changes and re-search for elements
   */
  private startIframeMonitoring(): void {
    if (this.iframeMonitor || this.hasFoundElement || !document) {
      return;
    }

    console.log('[ElementWatcher] Starting iframe src change monitoring');
    
    // Store current iframe srcs to detect changes
    const iframeSrcs = new Map<HTMLIFrameElement, string>();
    
    // Initialize tracking for existing iframes
    const updateIframeTracking = () => {
      if (this.hasFoundElement || !document) {
        return;
      }

      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        const currentSrc = iframe.src || '';
        const previousSrc = iframeSrcs.get(iframe);
        
        if (previousSrc !== undefined && previousSrc !== currentSrc) {
          console.log('[ElementWatcher] Detected iframe src change:', previousSrc, '->', currentSrc);
          
          // Re-enable iframe search when src changes
          this.iframeSearchDisabled = false;
          this.lastIframeSearchTime = 0; // Force immediate re-search
          
          // Trigger a new search after a short delay to allow new content to start loading
          setTimeout(() => {
            if (!this.hasFoundElement) {
              console.log('[ElementWatcher] Re-searching iframes after src change');
              this.findElement(0).catch((error) => {
                console.error('[ElementWatcher] Error in findElement after iframe src change:', error);
              }); // Reset retry count for new search
            }
          }, 500); // Give iframe time to start loading new content
        }
        
        iframeSrcs.set(iframe, currentSrc);
      }
    };

    // Use MutationObserver to watch for iframe src changes and new iframes
    this.iframeMonitor = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          const iframe = mutation.target as HTMLIFrameElement;
          updateIframeTracking();
        } else if (mutation.type === 'childList') {
          // Check if any iframes were added or removed
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLIFrameElement) {
              updateIframeTracking();
            } else if (node instanceof Element && node.querySelector('iframe')) {
              updateIframeTracking();
            }
          }
        }
      }
    });

    // Observe document body for changes
    if (document.body) {
      this.iframeMonitor.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src'],
      });
    }

    // Initial tracking
    updateIframeTracking();

    // Also periodically check for src changes (backup method)
    const checkInterval = setInterval(() => {
      if (this.hasFoundElement) {
        clearInterval(checkInterval);
        return;
      }
      updateIframeTracking();
    }, 1000); // Check every second

    // Store interval for cleanup (we'll need to track this)
    (this.iframeMonitor as any).__checkInterval = checkInterval;
  }

  /**
   * Stops monitoring iframes
   */
  private stopIframeMonitoring(): void {
    if (this.iframeMonitor) {
      console.log('[ElementWatcher] Stopping iframe src change monitoring');
      this.iframeMonitor.disconnect();
      
      // Clear any intervals
      if ((this.iframeMonitor as any).__checkInterval) {
        clearInterval((this.iframeMonitor as any).__checkInterval);
      }
      
      this.iframeMonitor = null;
    }
  }

  /**
   * Cleans up resources and resets the watcher state
   */
  destroy() {
    this.stopIframeMonitoring();
    this.reset();
  }

  /**
   * Clears the current retry timer
   */
  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Checks if the document is ready for element finding
   * @returns boolean indicating if document is ready
   */
  private isDocumentReady(): boolean {
    return !!document?.body;
  }

  /**
   * Updates the visibility checker state
   * @param isHidden Current visibility state
   * @param now Current timestamp
   */
  private updateChecker(isHidden: boolean, now: number): void {
    if (!this.checker) {
      this.checker = {
        isHidden,
        startHiddenTs: now,
        checkHiddenTs: now,
        isTimeout: false,
      };
    } else {
      this.checker = {
        ...this.checker,
        checkHiddenTs: now,
        isTimeout: now - this.checker.startHiddenTs > this.targetMissingSeconds * 1000,
      };
    }
  }

  /**
   * Checks element visibility in the correct document context
   * For iframe elements, checks visibility within the iframe's document
   * For main document elements, uses the standard isVisible function
   */
  private async checkElementVisibilityInContext(element: HTMLElement): Promise<boolean> {
    // For iframe elements, check visibility within the iframe's document
    if (this.iframeElementInfo) {
      try {
        const iframeDoc = this.iframeElementInfo.iframe.contentDocument;
        if (!iframeDoc || !iframeDoc.body) {
          console.log('[ElementWatcher] Cannot access iframe document for visibility check');
          return false;
        }
        
        // Use computePosition with the iframe's document body as reference
        const { computePosition, hide } = await import('@floating-ui/dom');
        const { middlewareData } = await computePosition(element, iframeDoc.body, {
          strategy: 'fixed',
          middleware: [hide()],
        });
        
        if (middlewareData?.hide?.referenceHidden) {
          return false;
        }
        return true;
      } catch (error) {
        console.log('[ElementWatcher] Error checking iframe element visibility:', error);
        return false;
      }
    }
    
    // For main document elements, use the standard isVisible function
    return await isVisible(element);
  }

  /**
   * Checks if the element is still valid (present in DOM and matches target selector)
   * This handles cases where SPA navigation keeps old elements in DOM
   * but they're no longer the intended target
   * @returns boolean indicating if element is valid and matches target
   */
  private isElementValid(): boolean {
    if (!this.element || !document?.body) {
      return false;
    }

    // For iframe elements, check if the element is still in the iframe's document
    if (this.iframeElementInfo) {
      try {
        const iframeDoc = this.iframeElementInfo.iframe.contentDocument;
        if (!iframeDoc || !iframeDoc.body) {
          return false;
        }
        
        // Check if element is still in the iframe's DOM
        if (!iframeDoc.body.contains(this.element)) {
          return false;
        }
        
        // For iframe elements, we don't need to verify the selector match
        // because the element was found through iframe search
        return true;
      } catch (error) {
        // If we can't access the iframe document, assume element is invalid
        console.log('[ElementWatcher] Cannot access iframe document, element invalid:', error);
        return false;
      }
    }

    // For main document elements, check if element is still in DOM
    if (!document.body.contains(this.element)) {
      return false;
    }

    // Additional check: verify this element still matches our target selector
    // This handles cases where SPA navigation keeps old elements in DOM
    // but they're no longer the intended target
    try {
      const currentElement = this.findElementBySelector();
      if (!currentElement) {
        return false;
      }

      // If the found element is different from our stored element,
      // it means the page has changed and we should update our reference
      if (currentElement !== this.element) {
        return false;
      }

      return true;
    } catch {
      // If selector evaluation fails, assume element is no longer valid
      return false;
    }
  }

  /**
   * Finds the target element using finderV2
   * @returns Found element or null if not found
   */
  private findElementBySelector(): Element | null {
    if (!document?.body) {
      return null;
    }
    return finderV2(this.parsedSelector.mainSelector, document.body);
  }

  /**
   * Finds a visible element by selector, checking all matching elements
   * and returning the first one that is not in a hidden section
   */
  private findVisibleElementBySelector(): Element | null {
    if (!document?.body) {
      return null;
    }

    const target = this.parsedSelector.mainSelector;
    
    // If we have a customSelector, we can find all matches and filter by visibility
    if (target.customSelector) {
      try {
        const selector = target.customSelector.replace(/\\/g, '\\');
        const allMatches = document.body.querySelectorAll(selector);
        
        // Check each match for visibility
        for (const match of Array.from(allMatches)) {
          if (!iframeUtils.isElementInHiddenSection(match)) {
            // Also check if content matches if specified
            if (target.content && !target.isDynamicContent) {
              const matchText = (match as HTMLElement).innerText?.trim() || '';
              const targetText = target.content.trim();
              // Default to 'exact' match if not specified
              const textMatchMode = (target as any).textMatchMode || 'exact';
              const textMatch = textMatchMode === 'exact' 
                ? matchText === targetText 
                : matchText.includes(targetText);
              if (!textMatch) {
                continue;
              }
            }
            return match;
          }
        }
      } catch (error) {
        console.log('[ElementWatcher] Error querying customSelector, falling back to finderV2:', error);
      }
    }
    
    // If we have selectorsList, try each selector and find first visible match
    if (target.selectorsList && target.selectorsList.length > 0) {
      for (const selectorStr of target.selectorsList) {
        try {
          const allMatches = document.body.querySelectorAll(selectorStr);
          
          // Check each match for visibility
          for (const match of Array.from(allMatches)) {
            if (!iframeUtils.isElementInHiddenSection(match)) {
              // Also check if content matches if specified
              if (target.content && !target.isDynamicContent) {
                const matchText = (match as HTMLElement).innerText?.trim() || '';
                const targetText = target.content.trim();
                // Default to 'exact' match if not specified
                const textMatchMode = (target as any).textMatchMode || 'exact';
                const textMatch = textMatchMode === 'exact' 
                  ? matchText === targetText 
                  : matchText.includes(targetText);
                if (!textMatch) {
                  continue;
                }
              }
              return match;
            }
          }
        } catch (error) {
          // Continue to next selector if this one fails
          continue;
        }
      }
    }
    
    // Fallback to original finderV2 method
    const el = finderV2(this.parsedSelector.mainSelector, document.body);
    if (el && !iframeUtils.isElementInHiddenSection(el)) {
      return el;
    }
    
    // If the found element is hidden, return null so we can retry
    // This allows the retry logic to potentially find a visible element later
    return null;
  }
}
