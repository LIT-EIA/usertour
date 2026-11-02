'use client';

import { Icons } from '@/components/atoms/icons';
import {
  Environment,
  LAUNCHER_FOCUS_PRESETS,
  LAUNCHER_FOCUS_TRAPS,
  LauncherFocusTrap,
} from '@usertour/types';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { updateEnvironmentLauncherFocus } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface LauncherFocusFormProps {
  isOpen: boolean;
  environment: Environment;
  onClose: () => void;
}

// Same limits as UpdateEnvironmentLauncherFocusInput
const TIMING_FIELDS = [
  { name: 'tabWindowMs', label: 'tabWindowLabel', max: 5000 },
  { name: 'holdFocusMs', label: 'holdFocusLabel', max: 5000 },
  { name: 'maxHoldCount', label: 'maxHoldCountLabel', max: 10 },
] as const;

const timingValue = (max: number) =>
  z.union([z.literal(''), z.coerce.number().int().min(0).max(max)]);

const formSchema = z.object({
  trap: z.enum(LAUNCHER_FOCUS_TRAPS as [LauncherFocusTrap, ...LauncherFocusTrap[]]),
  tabWindowMs: timingValue(5000),
  holdFocusMs: timingValue(5000),
  maxHoldCount: timingValue(10),
});

type FormValues = z.infer<typeof formSchema>;

const toFormValues = (environment: Environment): FormValues => {
  const trap = environment.launcherFocusTrap as LauncherFocusTrap;
  return {
    trap: LAUNCHER_FOCUS_TRAPS.includes(trap) ? trap : 'auto',
    tabWindowMs: environment.launcherTabWindowMs ?? '',
    holdFocusMs: environment.launcherHoldFocusMs ?? '',
    maxHoldCount: environment.launcherMaxHoldCount ?? '',
  };
};

export const EnvironmentLauncherFocusForm = (props: LauncherFocusFormProps) => {
  const { onClose, isOpen, environment } = props;
  const [updateMutation] = useMutation(updateEnvironmentLauncherFocus);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(environment),
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset(toFormValues(environment));
  }, [isOpen]);

  const trap = form.watch('trap');
  const preset = LAUNCHER_FOCUS_PRESETS[trap] ?? LAUNCHER_FOCUS_PRESETS.auto;

  async function handleOnSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const timing = (value: number | '') => (value === '' ? null : value);
      const response = await updateMutation({
        variables: {
          id: environment.id,
          trap: values.trap,
          tabWindowMs: timing(values.tabWindowMs),
          holdFocusMs: timing(values.holdFocusMs),
          maxHoldCount: timing(values.maxHoldCount),
        },
      });
      if (response.data?.updateEnvironmentLauncherFocus?.id) {
        onClose();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `${t('settings.environments.launcherFocus.saveFailure')}: ${getErrorMessage(error)}`,
      });
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.environments.launcherFocus.title')}</DialogTitle>
              <DialogDescription>
                {t('settings.environments.launcherFocus.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="trap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.environments.launcherFocus.trapLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LAUNCHER_FOCUS_TRAPS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {t(`settings.environments.launcherFocus.traps.${value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(`settings.environments.launcherFocus.trapHints.${field.value}`)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {preset.fix && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    {t('settings.environments.launcherFocus.timingTitle')}
                  </legend>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.environments.launcherFocus.timingDescription')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {TIMING_FIELDS.map(({ name, label, max }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t(`settings.environments.launcherFocus.${label}`)}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={max}
                                step={1}
                                placeholder={String(preset[name])}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.environments.launcherFocus.saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

EnvironmentLauncherFocusForm.displayName = 'EnvironmentLauncherFocusForm';
