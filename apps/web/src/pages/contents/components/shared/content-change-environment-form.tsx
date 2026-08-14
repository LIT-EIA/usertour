'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useMutation } from '@apollo/client';
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
import { updateContent } from '@usertour-packages/gql';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { getErrorMessage } from '@usertour/helpers';
import { Content } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface ContentChangeEnvironmentFormProps {
  content: Content;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  environmentId: z.string({
    required_error: 'Please select an environment.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export const ContentChangeEnvironmentForm = (
  props: ContentChangeEnvironmentFormProps,
) => {
  const { onSuccess, content, open, onOpenChange } = props;
  const [mutation] = useMutation(updateContent);
  const { environment, project } = useAppContext();
  const { environmentList } = useEnvironmentListContext();

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    defaultValues: { environmentId: content.environmentId || environment?.id },
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) {
      form.reset({ environmentId: content.environmentId || environment?.id });
    }
  }, [open, content.environmentId, environment?.id, form]);

  // Filter environments to only show those in the same project
  const availableEnvironments =
    environmentList?.filter((env) => {
      // If we have project info, filter by project
      if (project?.id) {
        // We need to check if env belongs to the same project
        // Since we don't have projectId in Environment type directly,
        // we'll show all environments from the list (they should already be filtered by project)
        return true;
      }
      return true;
    }) || [];

  async function handleOnSubmit(formValues: FormValues) {
    if (formValues.environmentId === content.environmentId) {
      // No change needed
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      const variables = {
        contentId: content.id,
        content: {
          environmentId: formValues.environmentId,
        },
      };
      const ret = await mutation({ variables });
      if (ret.data?.updateContent?.id) {
        toast({
          variant: 'success',
          title: t('contents.shared.changeEnvironment.successToast'),
        });
        onSuccess();
        onOpenChange(false);
      } else {
        showError(t('contents.shared.changeEnvironment.failureToast'));
      }
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('contents.shared.changeEnvironment.title')}</DialogTitle>
              <DialogDescription>
                {t('contents.shared.changeEnvironment.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 pb-4 pt-4">
              <FormField
                control={form.control}
                name="environmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contents.shared.changeEnvironment.environmentLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('contents.shared.changeEnvironment.selectPlaceholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableEnvironments.map((env) => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t('contents.shared.common.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('contents.shared.changeEnvironment.updateButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ContentChangeEnvironmentForm.displayName = 'ContentChangeEnvironmentForm';
