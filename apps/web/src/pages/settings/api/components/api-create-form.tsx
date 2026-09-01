import { useMutation } from '@apollo/client';
import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import { useState } from 'react';
import { useToast } from '@usertour-packages/use-toast';
import { CreateAccessToken } from '@usertour-packages/gql';
import { useAppContext } from '@/contexts/app-context';
import { useApiContext } from '@/contexts/api-context';
import { ApiKeyDialog } from './api-key-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { Icons } from '@/components/atoms/icons';
import { useTranslation } from 'react-i18next';

interface ApiCreateFormProps {
  visible: boolean;
  onClose: () => void;
}

interface CreateTokenResponse {
  createAccessToken: {
    accessToken: string;
  };
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please input token name.',
    })
    .max(50)
    .min(2),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const ApiCreateForm = ({ visible, onClose }: ApiCreateFormProps) => {
  const [newToken, setNewToken] = useState('');
  const { environment } = useAppContext();
  const { refetch } = useApiContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  const [createToken, { loading: creating }] = useMutation<CreateTokenResponse>(CreateAccessToken, {
    onCompleted: async (data) => {
      setNewToken(data.createAccessToken.accessToken);
      form.reset();
      onClose();
      await refetch();
      toast({
        title: t('common.success'),
        description: t('settings.api.createSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('settings.api.createFailure'),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!environment) {
      toast({
        title: t('common.error'),
        description: t('settings.api.environmentMissing'),
        variant: 'destructive',
      });
      return;
    }

    createToken({
      variables: {
        environmentId: environment.id,
        input: {
          name: values.name.trim(),
        },
      },
    });
  };

  return (
    <>
      <Dialog open={visible} onOpenChange={onClose}>
        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>{t('settings.api.createTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.api.createNameLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('settings.api.createNamePlaceholder')} {...field} />
                      </FormControl>
                      <FormDescription>{t('settings.common.changeableLater')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={onClose} disabled={creating}>
                  {t('settings.common.cancel')}
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  {creating ? t('settings.api.creating') : t('settings.api.createButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ApiKeyDialog
        token={newToken}
        title={t('settings.api.keyDialogCreatedTitle')}
        open={!!newToken}
        onOpenChange={() => setNewToken('')}
      />
    </>
  );
};
