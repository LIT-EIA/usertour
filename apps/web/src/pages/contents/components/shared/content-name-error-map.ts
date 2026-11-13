import type { TFunction } from 'i18next';
import type { z } from 'zod';

// Replaces zod's generic "String must contain at least 1 character(s)" on the Name field of the
// content create dialogs with a translated message that says it is an error and how to fix it
// (WCAG 3.3.1 Error Identification, 3.3.3 Error Suggestion). Pass it to zodResolver as the
// contextual errorMap; other fields keep their own messages.
export const contentNameErrorMap =
  (t: TFunction): z.ZodErrorMap =>
  (issue, ctx) => {
    if (issue.path[0] === 'name') {
      if (issue.code === 'too_small') {
        return { message: t('contents.create.nameRequired') };
      }
      if (issue.code === 'too_big') {
        return { message: t('contents.create.nameTooLong', { max: issue.maximum }) };
      }
    }
    return { message: ctx.defaultError };
  };
