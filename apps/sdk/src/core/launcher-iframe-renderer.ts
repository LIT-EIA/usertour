/**
 * Iframe Launcher Renderer
 *
 * Renders launcher tooltips INSIDE iframes for perfect alignment
 * Eliminates lag/drift by using co-located positioning
 */

import { IframeElementInfo } from '../utils/iframe-utils';
import { document as mainDocument } from '../utils/globals';

export interface IframeLauncherOptions {
  content: string | HTMLElement;
  placement: 'top' | 'bottom' | 'left' | 'right';
  offset: number;
  width: number;
  zIndex: number;
  onClose?: () => void;
}

/**
 * Renders a launcher tooltip inside an iframe
 * Co-located with the target element for perfect alignment
 */
export class IframeLauncherRenderer {
  private container: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private iframeElementInfo: IframeElementInfo;
  private options: IframeLauncherOptions;

  constructor(iframeElementInfo: IframeElementInfo, options: IframeLauncherOptions) {
    this.iframeElementInfo = iframeElementInfo;
    this.options = options;
  }

  /**
   * Renders the tooltip inside the iframe
   */
  render(): void {
    const { element: targetElement } = this.iframeElementInfo;
    const iframeDoc = this.getIframeDocument();

    if (!iframeDoc || !targetElement) {
      console.error('[IframeLauncherRenderer] Cannot access iframe document or target element');
      return;
    }

    // Ensure element is HTMLElement
    if (!(targetElement instanceof HTMLElement)) {
      console.error('[IframeLauncherRenderer] Target element is not an HTMLElement');
      return;
    }

    // Inject styles into iframe if not already present
    this.injectStyles(iframeDoc);

    // Create container for positioning context
    this.container = this.createContainer(iframeDoc, targetElement);

    // Create tooltip element
    this.tooltip = this.createTooltip(iframeDoc);

    // Insert into iframe DOM
    this.container.appendChild(this.tooltip);

    // Position tooltip relative to target
    this.updatePosition();

    // Watch for target size changes
    this.observeTargetResize();

    console.log('[IframeLauncherRenderer] Tooltip rendered inside iframe');
  }

  /**
   * Creates positioned container
   */
  private createContainer(iframeDoc: Document, targetElement: HTMLElement): HTMLElement {
    const container = iframeDoc.createElement('div');
    container.className = 'usertour-launcher-container';

    // Ensure parent has position context
    const parent = targetElement.parentElement;
    if (parent) {
      const parentStyle = iframeDoc.defaultView?.getComputedStyle(parent);
      if (parentStyle?.position === 'static') {
        // Add position relative to create context
        parent.style.position = 'relative';
      }

      // Insert container after target
      parent.insertBefore(container, targetElement.nextSibling);
    }

    return container;
  }

  /**
   * Creates tooltip element
   */
  private createTooltip(iframeDoc: Document): HTMLElement {
    const tooltip = iframeDoc.createElement('div');
    tooltip.className = 'usertour-launcher-tooltip';

    // Apply styles
    tooltip.style.cssText = `
      position: absolute;
      z-index: ${this.options.zIndex};
      width: ${this.options.width}px;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
    `;

    // Set content
    if (typeof this.options.content === 'string') {
      tooltip.innerHTML = this.options.content;
    } else {
      // Clone content from main document to iframe
      const clonedContent = this.cloneContentToIframe(this.options.content, iframeDoc);
      tooltip.appendChild(clonedContent);
    }

    // Add close button if callback provided
    if (this.options.onClose) {
      this.addCloseButton(tooltip, iframeDoc);
    }

    // Fade in
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
    });

    return tooltip;
  }

  /**
   * Clones content from main document to iframe document
   */
  private cloneContentToIframe(element: HTMLElement, iframeDoc: Document): HTMLElement {
    // Use adoptNode for proper document ownership
    const cloned = element.cloneNode(true) as HTMLElement;

    // Re-attach event listeners and fix references
    // This is a simplified version - you may need to handle React components differently
    return iframeDoc.adoptNode(cloned) as HTMLElement;
  }

  /**
   * Adds close button to tooltip
   */
  private addCloseButton(tooltip: HTMLElement, iframeDoc: Document): void {
    const closeBtn = iframeDoc.createElement('button');
    closeBtn.className = 'usertour-launcher-close';
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onClose?.();
      this.destroy();
    });

    tooltip.appendChild(closeBtn);
  }

  /**
   * Updates tooltip position relative to target
   */
  private updatePosition(): void {
    if (!this.tooltip || !this.container) return;

    const { element: targetElement } = this.iframeElementInfo;
    if (!targetElement || !(targetElement instanceof HTMLElement)) return;

    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = this.container.parentElement?.getBoundingClientRect();

    if (!containerRect) return;

    let top = 0;
    let left = 0;

    switch (this.options.placement) {
      case 'bottom':
        top = targetRect.bottom - containerRect.top + this.options.offset;
        left = targetRect.left - containerRect.left;
        break;
      case 'top':
        top = targetRect.top - containerRect.top - this.options.offset;
        left = targetRect.left - containerRect.left;
        // Adjust for tooltip height
        if (this.tooltip) {
          top -= this.tooltip.offsetHeight;
        }
        break;
      case 'left':
        top = targetRect.top - containerRect.top;
        left = targetRect.left - containerRect.left - this.options.offset;
        if (this.tooltip) {
          left -= this.tooltip.offsetWidth;
        }
        break;
      case 'right':
        top = targetRect.top - containerRect.top;
        left = targetRect.right - containerRect.left + this.options.offset;
        break;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }

  /**
   * Observes target element for size changes
   */
  private observeTargetResize(): void {
    const { element: targetElement } = this.iframeElementInfo;
    if (!targetElement || !(targetElement instanceof HTMLElement)) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updatePosition();
    });

    this.resizeObserver.observe(targetElement);
  }

  /**
   * Injects required styles into iframe
   */
  private injectStyles(iframeDoc: Document): void {
    // Check if styles already injected
    if (iframeDoc.getElementById('usertour-launcher-styles')) {
      return;
    }

    const style = iframeDoc.createElement('style');
    style.id = 'usertour-launcher-styles';
    style.textContent = `
      .usertour-launcher-container {
        position: relative;
        pointer-events: none;
      }

      .usertour-launcher-tooltip {
        position: absolute;
        pointer-events: auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
      }

      .usertour-launcher-tooltip::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
      }

      /* Arrow for bottom placement */
      .usertour-launcher-tooltip[data-placement="bottom"]::before {
        top: -8px;
        left: 20px;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 8px solid white;
      }

      /* Arrow for top placement */
      .usertour-launcher-tooltip[data-placement="top"]::before {
        bottom: -8px;
        left: 20px;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid white;
      }

      .usertour-launcher-close:hover {
        opacity: 0.7;
      }
    `;

    iframeDoc.head.appendChild(style);
  }

  /**
   * Gets iframe document
   */
  private getIframeDocument(): Document | null {
    try {
      return this.iframeElementInfo.iframe.contentDocument;
    } catch (error) {
      console.error('[IframeLauncherRenderer] Cannot access iframe document:', error);
      return null;
    }
  }

  /**
   * Updates tooltip visibility
   */
  show(): void {
    if (this.tooltip) {
      this.tooltip.style.opacity = '1';
      this.tooltip.style.pointerEvents = 'auto';
    }
  }

  /**
   * Hides tooltip
   */
  hide(): void {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
      this.tooltip.style.pointerEvents = 'none';
    }
  }

  /**
   * Updates tooltip content
   */
  updateContent(content: string | HTMLElement): void {
    if (!this.tooltip) return;

    if (typeof content === 'string') {
      this.tooltip.innerHTML = content;
    } else {
      const iframeDoc = this.getIframeDocument();
      if (iframeDoc) {
        this.tooltip.innerHTML = '';
        const cloned = this.cloneContentToIframe(content, iframeDoc);
        this.tooltip.appendChild(cloned);
      }
    }

    // Re-add close button if it was there
    if (this.options.onClose) {
      const iframeDoc = this.getIframeDocument();
      if (iframeDoc) {
        this.addCloseButton(this.tooltip, iframeDoc);
      }
    }

    // Reposition after content change
    requestAnimationFrame(() => {
      this.updatePosition();
    });
  }

  /**
   * Destroys the tooltip and cleans up
   */
  destroy(): void {
    console.log('[IframeLauncherRenderer] Destroying tooltip');

    // Disconnect observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove from DOM
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.tooltip = null;
  }
}

/**
 * Helper to check if we can render inside iframe
 */
export function canRenderInIframe(iframe: HTMLIFrameElement): boolean {
  try {
    // Try to access contentDocument
    const doc = iframe.contentDocument;
    if (!doc) return false;

    // Try to create an element (tests write access)
    const testEl = doc.createElement('div');
    return true;
  } catch (error) {
    // CORS or sandbox restrictions
    console.log('[IframeLauncherRenderer] Cannot render in iframe:', error);
    return false;
  }
}
