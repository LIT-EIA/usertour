'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
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
import { createContent } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { Content, ContentDataType } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface LauncherCreateFormProps {
  isOpen: boolean;
  onClose: (contentId?: string) => void;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please enter your launcher name.',
    })
    .max(30)
    .min(1),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const LauncherCreateForm = ({ onClose, isOpen }: LauncherCreateFormProps) => {
  const [createContentMutation] = useMutation(createContent);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { environment } = useAppContext();
  const navigate = useNavigate();
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

  const gotoBuilder = (content: Content) => {
    navigate(
      `/env/${content?.environmentId}/launchers/${content?.id}/builder/${content?.editedVersionId}`,
    );
  };

  async function handleOnSubmit(formValues: FormValues) {
    const { name } = formValues;
    setIsLoading(true);
    try {
      const data = {
        name,
        environmentId: environment?.id,
        type: ContentDataType.LAUNCHER,
      };
      const ret = await createContentMutation({ variables: data });
      if (!ret.data?.createContent?.id) {
        showError(t('contents.create.failure', { type: t('contents.types.launcher') }));
      }
      const content = ret.data?.createContent as Content;
      gotoBuilder(content);
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
              <DialogTitle>{t('contents.create.title', { type: t('contents.types.launcher') })}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4 ">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-1 space-y-0">
                    <FormLabel className="w-32 flex-none">{t('contents.create.nameLabel')}</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-x-1 w-full grow">
                        <Input placeholder={t('contents.create.namePlaceholder', { type: t('contents.types.launcher') })} {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t('contents.shared.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('contents.create.submit', { type: t('contents.types.launcher') })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

LauncherCreateForm.displayName = 'LauncherCreateForm';
