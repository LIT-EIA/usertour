'use client';

import { Icons } from '@/components/atoms/icons';
import { Environment } from '@usertour/types';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { updateEnvironments } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface EditFormProps {
  isOpen: boolean;
  environment: Environment;
  onClose: () => void;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please input your environment name.',
    })
    .max(20)
    .min(1),
});

type FormValues = z.infer<typeof formSchema>;

export const EnvironmentEditForm = (props: EditFormProps) => {
  const { onClose, isOpen, environment } = props;
  const [updateMutation] = useMutation(updateEnvironments);
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
    resolver: zodResolver(formSchema),
    defaultValues: { name: environment.name },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({ name: environment.name });
  }, [isOpen]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const data = { name: formValues.name, id: environment.id };
      const response = await updateMutation({ variables: data });
      if (response.data?.updateEnvironments?.id) {
        onClose();
      }
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.environments.editTitle')}</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.environments.nameLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('settings.environments.namePlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.environments.saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

EnvironmentEditForm.displayName = 'EnvironmentEditForm';
