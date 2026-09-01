'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogContent,
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
import { createLocalization } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { LocateItem, LocateSelect } from '@usertour-packages/shared-components';
import { getErrorMessage } from '@usertour/helpers';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface CreateFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  locale: z
    .string({
      required_error: 'Please input locale.',
    })
    .max(20)
    .min(2),
  name: z
    .string({
      required_error: 'Please input name.',
    })
    .max(20)
    .min(2),
  code: z
    .string({
      required_error: 'Please input code.',
    })
    .max(20)
    .min(2),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {};

export const LocalizationCreateForm = ({ onClose, isOpen }: CreateFormProps) => {
  const [createMutation] = useMutation(createLocalization);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { project } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset();
  }, [isOpen]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const data = {
        ...formValues,
        projectId: project?.id,
      };
      const ret = await createMutation({ variables: { data } });

      if (!ret.data?.createLocalization?.id) {
        showError(t('settings.localizations.createFailure'));
      }
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  const handleOnSelect = (item: LocateItem) => {
    form.setValue('name', `${item.language.name} (${item.country.code})`);
    form.setValue('code', item.locale);
    form.setValue('locale', item.locale);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="!w-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)} className="w-[450px]">
            <DialogHeader>
              <DialogTitle>{t('settings.localizations.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-2 mt-4 mb-4">
              <FormField
                control={form.control}
                name="locale"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      {t('settings.localizations.form.localeLabel')}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            {t('settings.localizations.form.localeTooltip')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <LocateSelect popperContentClass="w-[450px]" onSelect={handleOnSelect} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      {t('settings.localizations.form.nameLabel')}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            {t('settings.localizations.form.nameTooltip')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('settings.localizations.form.namePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      {t('settings.localizations.form.codeLabel')}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            {t('settings.localizations.form.codeTooltip')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('settings.localizations.form.codePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.localizations.createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

LocalizationCreateForm.displayName = 'LocalizationCreateForm';
