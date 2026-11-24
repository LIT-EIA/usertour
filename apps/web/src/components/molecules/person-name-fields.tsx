import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-packages/form';
import { Input } from '@usertour-packages/input';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { TFunction } from 'i18next';
import type { Control, FieldValues, Path } from 'react-hook-form';

/** UI limit per name part; the API only requires a non-empty first name. */
const NAME_PART_MAX_LENGTH = 50;

/**
 * Zod schema for a person's name as separate parts: first name required, last name optional.
 * Merge it into a form schema with `.merge()` / `.extend()`.
 */
export const createPersonNameSchema = (t: TFunction) => {
  const tooLong = t('common.personName.tooLong', { max: NAME_PART_MAX_LENGTH });
  return z.object({
    firstName: z
      .string({ required_error: t('common.personName.firstNameRequired') })
      .trim()
      .min(1, t('common.personName.firstNameRequired'))
      .max(NAME_PART_MAX_LENGTH, tooLong),
    lastName: z.string().trim().max(NAME_PART_MAX_LENGTH, tooLong).optional(),
  });
};

export type PersonNameFormValues = z.infer<ReturnType<typeof createPersonNameSchema>>;

interface PersonNameFieldsProps<T extends FieldValues & PersonNameFormValues> {
  control: Control<T>;
  firstNamePlaceholder: string;
  lastNamePlaceholder: string;
  /** True when entering your own name (browser autofill); false for someone else's (invites). */
  isOwnName: boolean;
}

/** First name + last name inputs for react-hook-form forms using `createPersonNameSchema`. */
export const PersonNameFields = <T extends FieldValues & PersonNameFormValues>({
  control,
  firstNamePlaceholder,
  lastNamePlaceholder,
  isOwnName,
}: PersonNameFieldsProps<T>) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name={'firstName' as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('common.personName.firstNameLabel')}</FormLabel>
            <FormControl>
              <Input
                placeholder={firstNamePlaceholder}
                autoComplete={isOwnName ? 'given-name' : 'off'}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={'lastName' as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('common.personName.lastNameLabel')}</FormLabel>
            <FormControl>
              <Input
                placeholder={lastNamePlaceholder}
                autoComplete={isOwnName ? 'family-name' : 'off'}
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

PersonNameFields.displayName = 'PersonNameFields';
