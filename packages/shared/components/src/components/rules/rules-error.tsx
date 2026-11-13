import { EXTENSION_CONTENT_RULES } from '@usertour-packages/constants';
import {
  ValidationBubble,
  ValidationBubbleAnchor,
  ValidationBubbleContent,
} from '@usertour-packages/shared-editor';
import React from 'react';

// Validation bubble for rule conditions. Shares the Popper-based bubble from shared-editor, which
// announces itself (role="alert") without taking focus; see validation-bubble.tsx there.
const RulesError = ValidationBubble;
const RulesErrorAnchor = ValidationBubbleAnchor;

const RulesErrorContent = React.forwardRef<
  React.ElementRef<typeof ValidationBubbleContent>,
  React.ComponentPropsWithoutRef<typeof ValidationBubbleContent>
>(({ style, ...props }, ref) => (
  <ValidationBubbleContent
    ref={ref}
    style={{ zIndex: EXTENSION_CONTENT_RULES, ...style }}
    {...props}
  />
));

RulesErrorContent.displayName = 'RulesErrorContent';

export { RulesError, RulesErrorContent, RulesErrorAnchor };
