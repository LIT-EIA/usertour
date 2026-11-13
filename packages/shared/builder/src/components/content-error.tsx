// Validation bubble for builder fields. Same component as the editor and rules bubbles (Popper,
// role="alert", no focus handling of its own); see validation-bubble.tsx in shared-editor. While
// open it marks its anchor so a refused Save can move focus there with focusFirstValidationError.
export {
  ValidationBubble as ContentError,
  ValidationBubbleAnchor as ContentErrorAnchor,
  ValidationBubbleContent as ContentErrorContent,
} from '@usertour-packages/shared-editor';
