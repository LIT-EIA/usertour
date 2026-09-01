'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
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
import {
  CompanyIcon,
  EventIcon2,
  SpinnerIcon,
  UserIcon,
  UserIcon2,
} from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  CreateAttributeMutationVariables,
  useCreateAttributeMutation,
} from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { Attribute, AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface CreateFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultValues?: Partial<FormValues>;
  disabledFields?: Array<'dataType' | 'bizType'>;
  zIndex?: number;
  onSuccess?: (attribute: Partial<Attribute>) => void;
}

const createFormSchema = (t: TFunction) =>
  z.object({
    dataType: z.enum([
      String(BizAttributeTypes.Number),
      String(BizAttributeTypes.String),
      String(BizAttributeTypes.Boolean),
      String(BizAttributeTypes.DateTime),
      String(BizAttributeTypes.List),
    ]),
    bizType: z.enum([
      String(AttributeBizTypes.User),
      String(AttributeBizTypes.Company),
      String(AttributeBizTypes.Membership),
      String(AttributeBizTypes.Event),
    ]),
    displayName: z
      .string({
        required_error: t('contentBuilder.editor.bindAttribute.createForm.displayNameRequired'),
      })
      .max(20, { message: t('contentBuilder.editor.bindAttribute.createForm.nameMaxLength') })
      .min(2, { message: t('contentBuilder.editor.bindAttribute.createForm.nameMinLength') }),
    codeName: z
      .string({
        required_error: t('contentBuilder.editor.bindAttribute.createForm.codeNameRequired'),
      })
      .max(20, { message: t('contentBuilder.editor.bindAttribute.createForm.nameMaxLength') })
      .min(2, { message: t('contentBuilder.editor.bindAttribute.createForm.nameMinLength') }),
    description: z.string({}).max(100, {
      message: t('contentBuilder.editor.bindAttribute.createForm.descriptionMaxLength'),
    }),
  });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export const AttributeCreateForm = ({
  onOpenChange,
  isOpen,
  projectId,
  defaultValues: propDefaultValues,
  disabledFields = [],
  zIndex,
  onSuccess,
}: CreateFormProps) => {
  const { t } = useTranslation();
  const { invoke } = useCreateAttributeMutation();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const formSchema = useMemo(() => createFormSchema(t), [t]);

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const defaultValues: Partial<FormValues> = {
    description: '',
    bizType: String(AttributeBizTypes.User),
    dataType: String(BizAttributeTypes.Number),
    displayName: '',
    codeName: '',
    ...propDefaultValues,
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
        bizType: Number.parseInt(formValues.bizType),
        dataType: Number.parseInt(formValues.dataType),
        projectId,
      } as CreateAttributeMutationVariables;
      const result = await invoke(data);
      if (!result?.id) {
        showError(t('contentBuilder.editor.bindAttribute.createForm.createFailed'));
      } else {
        onSuccess?.(result);
      }
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" style={{ zIndex: zIndex }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('contentBuilder.editor.bindAttribute.createForm.title')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-2 mt-4 mb-4">
              <div className="flex flex-row justify-between">
                <FormField
                  control={form.control}
                  name="bizType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        {t('contentBuilder.editor.bindAttribute.createForm.objectType')}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-700">
                              <p>
                                {t(
                                  'contentBuilder.editor.bindAttribute.createForm.objectTypeTooltip',
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={disabledFields.includes('bizType')}
                      >
                        <FormControl>
                          <SelectTrigger className="w-72">
                            <SelectValue
                              placeholder={t(
                                'contentBuilder.editor.bindAttribute.createForm.objectTypePlaceholder',
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-72">
                          <SelectItem value={String(AttributeBizTypes.User)}>
                            <div className="flex flex-row">
                              <UserIcon width={16} height={16} className="mr-1" />
                              {t('contentBuilder.editor.bindAttribute.createForm.objectTypeUser')}
                            </div>
                          </SelectItem>
                          <SelectItem value={String(AttributeBizTypes.Company)}>
                            <div className="flex flex-row">
                              <CompanyIcon width={16} height={16} className="mr-1" />
                              {t(
                                'contentBuilder.editor.bindAttribute.createForm.objectTypeCompany',
                              )}
                            </div>
                          </SelectItem>
                          <SelectItem value={String(AttributeBizTypes.Membership)}>
                            <div className="flex flex-row">
                              <UserIcon2 width={16} height={16} className="mr-1" />
                              {t(
                                'contentBuilder.editor.bindAttribute.createForm.objectTypeMembership',
                              )}
                            </div>
                          </SelectItem>
                          <SelectItem value={String(AttributeBizTypes.Event)}>
                            <div className="flex flex-row">
                              <EventIcon2 width={16} height={16} className="mr-1" />
                              {t('contentBuilder.editor.bindAttribute.createForm.objectTypeEvent')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dataType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        {t('contentBuilder.editor.bindAttribute.createForm.dataType')}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-700">
                              <p>
                                {t(
                                  'contentBuilder.editor.bindAttribute.createForm.dataTypeTooltip',
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={disabledFields.includes('dataType')}
                      >
                        <FormControl>
                          <SelectTrigger className="w-72">
                            <SelectValue
                              placeholder={t(
                                'contentBuilder.editor.bindAttribute.createForm.dataTypePlaceholder',
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-72">
                          <SelectItem value={String(BizAttributeTypes.Number)}>
                            {t('contentBuilder.editor.bindAttribute.createForm.dataTypeNumber')}
                          </SelectItem>
                          <SelectItem value={String(BizAttributeTypes.String)}>
                            {t('contentBuilder.editor.bindAttribute.createForm.dataTypeString')}
                          </SelectItem>
                          <SelectItem value={String(BizAttributeTypes.Boolean)}>
                            {t('contentBuilder.editor.bindAttribute.createForm.dataTypeBoolean')}
                          </SelectItem>
                          <SelectItem value={String(BizAttributeTypes.DateTime)}>
                            {t('contentBuilder.editor.bindAttribute.createForm.dataTypeDateTime')}
                          </SelectItem>
                          <SelectItem value={String(BizAttributeTypes.List)}>
                            {t('contentBuilder.editor.bindAttribute.createForm.dataTypeList')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex flex-row justify-between">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        {t('contentBuilder.editor.bindAttribute.createForm.displayName')}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-700">
                              <p>
                                {t(
                                  'contentBuilder.editor.bindAttribute.createForm.displayNameTooltip',
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'contentBuilder.editor.bindAttribute.createForm.displayNamePlaceholder',
                          )}
                          className="w-72"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('contentBuilder.editor.bindAttribute.createForm.displayNameHint')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="codeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        {t('contentBuilder.editor.bindAttribute.createForm.codeName')}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-700">
                              <p>
                                {t(
                                  'contentBuilder.editor.bindAttribute.createForm.codeNameTooltip',
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'contentBuilder.editor.bindAttribute.createForm.codeNamePlaceholder',
                          )}
                          className="w-72"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('contentBuilder.editor.bindAttribute.createForm.codeNameHint')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      {t('contentBuilder.editor.bindAttribute.createForm.description')}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            <p>
                              {t(
                                'contentBuilder.editor.bindAttribute.createForm.descriptionTooltip',
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          'contentBuilder.editor.bindAttribute.createForm.descriptionPlaceholder',
                        )}
                        className="w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  {t('contentBuilder.editor.bindAttribute.createForm.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('contentBuilder.editor.bindAttribute.createForm.createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

AttributeCreateForm.displayName = 'AttributeCreateForm';
