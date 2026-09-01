import { ElementSelectorPropsData } from '@usertour/types';
import { finderV2 } from '@usertour-packages/finder';
import { document } from './globals';
import { iframeUtils } from './iframe-utils';
import { isVisible } from './conditions';

/**
 * Parsed selector result containing main selector and optional conditional selector
 */
export interface ParsedSelector {
  mainSelector: ElementSelectorPropsData;
  conditionalSelector?: ElementSelectorPropsData;
}

/**
 * Parses a selector string that may contain a conditional selector separated by "<<<"
 * Format: <mainSelector> <<< <conditionalSelector>
 *
 * @param selector - The selector string or ElementSelectorPropsData to parse
 * @returns Parsed selector with main and conditional parts
 */
export function parseSelectorWithCondition(
  selector: string | ElementSelectorPropsData,
): ParsedSelector {
  // If it's already an ElementSelectorPropsData, check customSelector and selectorsList
  if (typeof selector !== 'string') {
    const result: ParsedSelector = {
      mainSelector: { ...selector },
    };

    // Check customSelector for <<< pattern
    if (selector.customSelector?.includes(' <<< ')) {
      const [main, conditional] = selector.customSelector.split(' <<< ').map((s) => s.trim());
      result.mainSelector = {
        ...selector,
        customSelector: main,
      };
      result.conditionalSelector = {
        type: 'manual',
        customSelector: conditional,
      };
      return result;
    }

    // Check selectorsList for <<< pattern
    if (selector.selectorsList && selector.selectorsList.length > 0) {
      const firstSelector = selector.selectorsList[0];
      if (firstSelector.includes(' <<< ')) {
        const [main, conditional] = firstSelector.split(' <<< ').map((s) => s.trim());
        result.mainSelector = {
          ...selector,
          selectorsList: [main, ...selector.selectorsList.slice(1)],
        };
        result.conditionalSelector = {
          type: 'manual',
          customSelector: conditional,
        };
        return result;
      }
    }

    return result;
  }

  // If it's a string, parse it
  if (selector.includes(' <<< ')) {
    const [main, conditional] = selector.split(' <<< ').map((s) => s.trim());
    return {
      mainSelector: {
        type: 'manual',
        customSelector: main,
      },
      conditionalSelector: {
        type: 'manual',
        customSelector: conditional,
      },
    };
  }

  return {
    mainSelector: {
      type: 'manual',
      customSelector: selector,
    },
  };
}

/**
 * Checks if the conditional selector element is present and visible
 * @param conditionalSelector - The conditional selector to check
 * @returns Promise that resolves to true if element is present and visible, false otherwise
 */
export async function checkConditionalSelectorPresent(
  conditionalSelector: ElementSelectorPropsData,
): Promise<boolean> {
  if (!document) {
    return false;
  }

  try {
    // First try to find element in main document
    let el = finderV2(conditionalSelector, document) as HTMLElement | null;

    // If not found in main document, search in iframes
    if (!el) {
      const iframeElementInfo = await iframeUtils.searchElementInIframes(conditionalSelector);
      if (iframeElementInfo) {
        el = iframeElementInfo.element as HTMLElement;
      }
    }

    if (!el) {
      return false;
    }

    // Check if element is visible
    return await isVisible(el);
  } catch (error) {
    console.error('[SelectorParser] Error checking conditional selector:', error);
    return false;
  }
}
