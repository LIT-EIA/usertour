'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { useSubscriptionContext } from '@/contexts/subscription-context';
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
import { createEnvironments } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { PlanType } from '@usertour/types';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@usertour-packages/alert';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CreateFormProps {
  isOpen: boolean;
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

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const EnvironmentCreateForm = ({ onClose, isOpen }: CreateFormProps) => {
  const [createMutation] = useMutation(createEnvironments);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { project, globalConfig } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { planType } = useSubscriptionContext();
  const { environmentList } = useEnvironmentListContext();
  const navigate = useNavigate();

  const PLAN_LIMITS: Record<PlanType, number> = {
    [PlanType.HOBBY]: 1,
    [PlanType.STARTER]: 2,
    [PlanType.GROWTH]: 3,
    [PlanType.BUSINESS]: Number.POSITIVE_INFINITY,
  };

  const isLimit =
    !globalConfig?.isSelfHostedMode && (environmentList?.length ?? 0) >= PLAN_LIMITS[planType];

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
      const data = { name: formValues.name, projectId: project?.id };
      const ret = await createMutation({ variables: data });

      if (!ret.data?.createEnvironments?.id) {
        showError(t('settings.environments.createFailure'));
      }
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  if (isLimit) {
    return (
      <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('settings.environments.createTitle')}</DialogTitle>
          </DialogHeader>
          <Alert className="bg-primary/10 border-primary/5">
            <AlertCircle className="h-4 w-4 !text-primary" />
            <AlertTitle>{t('settings.environments.limitTitle')}</AlertTitle>
            <AlertDescription>
              {t('settings.environments.limitDescription')}{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-normal inline"
                onClick={() => {
                  onClose();
                  navigate(`/project/${project?.id}/settings/billing`);
                }}
              >
                {t('settings.environments.upgradeLink')}
              </Button>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/project/${project?.id}/settings/billing`);
              }}
            >
              {t('settings.environments.upgrade')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.environments.createTitle')}</DialogTitle>
            </DialogHeader>
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
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.environments.createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

EnvironmentCreateForm.displayName = 'EnvironmentCreateForm';
