'use client';

import { Icons } from '@/components/atoms/icons';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@usertour-packages/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { updateTheme } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { Theme } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface RenameFormProps {
  data: Theme;
  onSubmit: () => void;
  children: React.ReactNode;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please input your theme name.',
    })
    .max(20)
    .min(1),
});

type FormValues = z.infer<typeof formSchema>;

export const ThemeRenameForm = (props: RenameFormProps) => {
  const { data, children, onSubmit } = props;
  const [updateMutation] = useMutation(updateTheme);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [open, setOpen] = React.useState(false);
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
    defaultValues: { name: data.name },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({ name: data.name });
  }, [data]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const variables = {
        id: data.id,
        name: formValues.name,
        settings: data.settings,
        isDefault: data.isDefault,
      };
      const ret = await updateMutation({
        variables,
      });

      if (!ret.data?.updateTheme?.id) {
        showError(t('settings.themes.renameFailure'));
      }
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
    onSubmit();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.themes.renameTitle')}</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.themes.duplicateNameLabel')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('settings.themes.duplicateNamePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t('settings.common.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.common.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ThemeRenameForm.displayName = 'ThemeRenameForm';
