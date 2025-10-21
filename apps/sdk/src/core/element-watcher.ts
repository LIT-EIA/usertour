import { isVisibleNode } from '@usertour-packages/dom';
import { finderV2 } from '@usertour-packages/finder';
import { ElementSelectorPropsData } from '@usertour/types';
import { isVisible } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { document } from '../utils/globals';
import { Evented } from './evented';
import { DEFAULT_TARGET_MISSING_SECONDS } from './common';
import { iframeUtils, IframeElementInfo } from '../utils/iframe-utils';

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
  private timer: NodeJS.Timeout | null = null; // Timer for retry mechanism
  private element: Element | null = null; // Reference to the found element
  private checker: CheckContentIsVisible | null = null; // Visibility state tracker
  private targetMissingSeconds = DEFAULT_TARGET_MISSING_SECONDS; // Time allowed for target element to be missing
  private iframeElementInfo: IframeElementInfo | null = null; // Iframe element information if found in iframe
  private isSearchingIframes = false; // Prevent multiple concurrent iframe searches
  private hasFoundElement = false; // Prevent multiple element found events
  private iframeSearchDisabled = false; // Completely disable iframe search after first attempt

  constructor(target: ElementSelectorPropsData) {
    super();
    this.target = target;
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
  findElement(retryTimes = 0): void {
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

    // First try to find element in main document
    console.log('[ElementWatcher] Searching for element in main document:', this.target);
    const el = this.findElementBySelector();
    if (el) {
      console.log('[ElementWatcher] Element found in main document:', el);
      this.element = el;
      this.iframeElementInfo = null;
      this.hasFoundElement = true;
      this.trigger(AppEvents.ELEMENT_FOUND, el);
      return;
    }

    console.log('[ElementWatcher] Element not found in main document, searching iframes...');
    // If not found in main document, search in iframes (only once)
    if (!this.iframeSearchDisabled) {
      this.searchInIframes(retryTimes);
    } else {
      console.log('[ElementWatcher] Iframe search already attempted, scheduling retry');
      this.scheduleRetry(retryTimes);
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
      // Try to find the element again with the same selector
      const el = this.findElementBySelector();
      if (el) {
        // Found a new element that matches our selector
        this.element = el;
        this.iframeElementInfo = null;
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
    this.iframeSearchDisabled = true; // Disable after starting search
    console.log('[ElementWatcher] Starting iframe search for:', this.target);
    try {
      const iframeElementInfo = await iframeUtils.searchElementInIframes(this.target);
      
      if (iframeElementInfo) {
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
      this.findElement(retryTimes + 1);
    }, RETRY_DELAY);
  }

  /**
   * Resets the element watcher state
   * Useful when SPA navigation occurs and we want to start fresh
   */
  reset(): void {
    this.clearTimer();
    this.element = null;
    this.checker = null;
    this.iframeElementInfo = null;
    this.isSearchingIframes = false;
    this.hasFoundElement = false;
    this.iframeSearchDisabled = false;
  }

  /**
   * Cleans up resources and resets the watcher state
   */
  destroy() {
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
    return finderV2(this.target, document.body);
  }
}
