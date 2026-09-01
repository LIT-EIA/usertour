'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { duplicateContent } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { getContentTypeGenderContext } from '@/utils/content-type';
import { Content, ContentDataType } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface ContentDuplicateFormProps {
  content: Content;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please enter name.',
    })
    .max(30)
    .min(1),
  targetEnvironmentId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const ContentDuplicateForm = (props: ContentDuplicateFormProps) => {
  const { onSuccess, content, open, onOpenChange, name } = props;
  const [mutation] = useMutation(duplicateContent);
  const { environment } = useAppContext();

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const typeContext = getContentTypeGenderContext(name);
  const translatedType = t(`contents.types.${name}`);
  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: content.name, targetEnvironmentId: environment?.id },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset();
  }, [open]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const variables = {
        contentId: content.id,
        name: formValues.name,
      };
      const ret = await mutation({ variables });
      if (ret.data.duplicateContent.id) {
        toast({
          variant: 'success',
          title: t('contents.shared.duplicate.successToast', {
            type: translatedType,
            context: typeContext,
          }),
        });
      }
      onSuccess();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {t('contents.shared.duplicate.title', { type: translatedType })}
              </DialogTitle>
              <DialogDescription>
                {name === ContentDataType.FLOW
                  ? t('contents.shared.duplicate.descriptionFlow', {
                      type: translatedType,
                      context: typeContext,
                    })
                  : t('contents.shared.duplicate.description', {
                      type: translatedType,
                      context: typeContext,
                    })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 pb-4 pt-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contents.shared.duplicate.nameLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('contents.shared.duplicate.namePlaceholder', {
                            type: translatedType,
                            context: typeContext,
                          })}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t('contents.shared.common.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('contents.shared.common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ContentDuplicateForm.displayName = 'ContentDuplicateForm';
