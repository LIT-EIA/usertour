import { Button } from '@usertour-packages/button';
import { useCallback, useState } from 'react';
import {
  useGetSalesforceObjectFieldsQuery,
  useUpsertIntegrationObjectMappingMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { useAppContext } from '@/contexts/app-context';
import {
  SpinnerIcon,
  SalesforceIcon,
  UsertourIcon2,
  ArrowRightLeftIcon,
} from '@usertour-packages/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@usertour-packages/dialog';
import { cn } from '@usertour/helpers';
import {
  AttributeBizTypes,
  IntegrationObjectMappingSettings,
  IntegrationObjectMappingModel,
} from '@usertour/types';
import { ObjectMappingPanel } from './object-mapping-panel';
import { ObjectMappingObjectSelect } from './object-mapping-select';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import { InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SalesforceMappingIcon = ({ className }: { className?: string }) => (
  <SalesforceIcon className={cn('w-4 h-4', className)} />
);

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

const useSalesforceObjects = () => {
  const { t } = useTranslation();
  return [
    {
      name: 'Contact',
      label: t('settings.integrations.objectMapping.objectLabels.salesforce.Contact'),
      type: 'standard' as const,
    },
    {
      name: 'Account',
      label: t('settings.integrations.objectMapping.objectLabels.salesforce.Account'),
      type: 'standard' as const,
    },
    {
      name: 'Lead',
      label: t('settings.integrations.objectMapping.objectLabels.salesforce.Lead'),
      type: 'standard' as const,
    },
    {
      name: 'Opportunity',
      label: t('settings.integrations.objectMapping.objectLabels.salesforce.Opportunity'),
      type: 'standard' as const,
    },
  ];
};

const useUsertourObjects = () => {
  const { t } = useTranslation();
  return [
    { name: 'User', label: t('settings.integrations.objectMapping.objectLabels.usertour.User') },
    {
      name: 'Company',
      label: t('settings.integrations.objectMapping.objectLabels.usertour.Company'),
    },
  ];
};

interface ObjectSelectionPanelProps {
  salesforceObject: string;
  usertourObject: string;
  onSalesforceObjectChange: (value: string) => void;
  onUsertourObjectChange: (value: string) => void;
  onContinue: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ObjectSelectionPanel = (props: ObjectSelectionPanelProps) => {
  const {
    salesforceObject,
    usertourObject,
    onSalesforceObjectChange,
    onUsertourObjectChange,
    onContinue,
    onCancel,
    isLoading,
  } = props;
  const { t } = useTranslation();
  const salesforceObjects = useSalesforceObjects();
  const usertourObjects = useUsertourObjects();
  return (
    <>
      <div className="space-y-1 py-4">
        <div className="flex items-center gap-4 justify-between">
          <Label htmlFor="salesforce-object" className="w-72">
            {t('settings.integrations.objectMapping.dialog.salesforceObjectLabel')}
          </Label>
          <div className="w-6" />
          <Label htmlFor="usertour-object" className="w-72">
            {t('settings.integrations.objectMapping.dialog.usertourObjectLabel')}
          </Label>
        </div>

        <div className="flex items-center gap-4 justify-between">
          <ObjectMappingObjectSelect
            items={salesforceObjects}
            value={salesforceObject}
            onValueChange={onSalesforceObjectChange}
            placeholder={t(
              'settings.integrations.objectMapping.dialog.salesforceObjectPlaceholder',
            )}
          />

          <div className="flex items-center justify-center">
            <ArrowRightLeftIcon className="h-6 w-6 " />
          </div>

          <ObjectMappingObjectSelect
            items={usertourObjects}
            value={usertourObject}
            onValueChange={onUsertourObjectChange}
            placeholder={t('settings.integrations.objectMapping.dialog.usertourObjectPlaceholder')}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          {t('settings.integrations.objectMapping.dialog.cancelButton')}
        </Button>
        <Button onClick={onContinue} disabled={!salesforceObject || !usertourObject}>
          {t('settings.integrations.objectMapping.dialog.continueButton')}
        </Button>
      </DialogFooter>
    </>
  );
};

interface ObjectMappingDialogProps {
  integrationId: string;
  initialMapping?: IntegrationObjectMappingModel;
  onSuccess?: () => void;
  onClose?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
}

export function ObjectMappingDialog({
  integrationId,
  initialMapping,
  onSuccess,
  onClose,
  open,
  onOpenChange,
  mode = 'create',
}: ObjectMappingDialogProps) {
  const { project } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<'objects' | 'fields'>(mode === 'edit' ? 'fields' : 'objects');
  const [salesforceObject, setSalesforceObject] = useState<string>(
    initialMapping?.sourceObjectType || '',
  );
  const [usertourObject, setUsertourObject] = useState<string>(
    initialMapping?.destinationObjectType || '',
  );
  const [isSyncStream, setIsSyncStream] = useState(initialMapping?.settings?.isSyncStream || false);
  const [mappingData, setMappingData] = useState<IntegrationObjectMappingSettings | undefined>(
    initialMapping?.settings || undefined,
  );

  // Get Salesforce object fields
  const { data: objectFields } = useGetSalesforceObjectFieldsQuery(integrationId, {
    skip: !integrationId,
  });

  // Mutation hook for saving mapping
  const { invoke: upsertMapping, loading: isSaving } = useUpsertIntegrationObjectMappingMutation();

  // Get attributes based on selected usertour object type
  const selectedBizType =
    usertourObject === 'User'
      ? AttributeBizTypes.User
      : usertourObject === 'Company'
        ? AttributeBizTypes.Company
        : AttributeBizTypes.User; // Default to User when no object selected

  const selectedSalesforceObject = salesforceObject ? { name: salesforceObject } : null;
  const selectedSalesforceFields = selectedSalesforceObject
    ? objectFields?.standardObjects?.find((obj: any) => obj.name === salesforceObject)?.fields || []
    : [];

  // Convert API field data to UI format
  const dynamicSalesforceFields = selectedSalesforceFields.map((field: any) => ({
    value: field.name,
    label: field.label || field.name,
    icon: <SalesforceMappingIcon />,
  }));

  const handleContinue = () => {
    if (!salesforceObject || !usertourObject) {
      toast({
        title: t('common.error'),
        description: t('settings.integrations.objectMapping.dialog.bothObjectsRequiredToast'),
        variant: 'destructive',
      });
      return;
    }
    setStep('fields');
  };

  const handleBack = () => {
    setStep('objects');
  };

  const handleMappingChange = (mapping: IntegrationObjectMappingSettings) => {
    setMappingData(mapping);
  };

  const handleSaveMapping = useCallback(async () => {
    if (!integrationId || !mappingData) {
      toast({
        title: t('common.error'),
        description: t('settings.integrations.objectMapping.dialog.missingDataToast'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // Save the object mapping using the mutation
      const result = await upsertMapping(integrationId, {
        sourceObjectType: salesforceObject,
        destinationObjectType: usertourObject,
        settings: {
          ...mappingData,
          isSyncStream,
        },
        enabled: true,
      });

      if (result) {
        toast({
          title: t('common.success'),
          description:
            mode === 'edit'
              ? t('settings.integrations.objectMapping.dialog.saveSuccessToastUpdate')
              : t('settings.integrations.objectMapping.dialog.saveSuccessToastCreate'),
        });
        onSuccess?.();
        handleClose();
      }
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast({
        title: t('common.error'),
        description:
          mode === 'edit'
            ? t('settings.integrations.objectMapping.dialog.saveFailureToastUpdate')
            : t('settings.integrations.objectMapping.dialog.saveFailureToastCreate'),
        variant: 'destructive',
      });
    }
  }, [
    integrationId,
    mappingData,
    salesforceObject,
    usertourObject,
    isSyncStream,
    upsertMapping,
    toast,
    onSuccess,
    mode,
    t,
  ]);

  const handleClose = () => {
    setStep(mode === 'edit' ? 'fields' : 'objects');
    setSalesforceObject(initialMapping?.sourceObjectType || '');
    setUsertourObject(initialMapping?.destinationObjectType || '');
    setMappingData(initialMapping?.settings || undefined);
    setIsSyncStream(initialMapping?.settings?.isSyncStream || false);
    onOpenChange(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-2xl', step === 'objects' ? 'max-w-2xl' : 'max-w-4xl')}>
        <DialogHeader>
          <DialogTitle>
            {step === 'objects' &&
              (mode === 'edit'
                ? t('settings.integrations.objectMapping.dialog.titleEditMapping')
                : t('settings.integrations.objectMapping.dialog.titleSelectObjects'))}

            {step !== 'objects' && (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <SalesforceMappingIcon className="w-6 h-6" /> {salesforceObject}
                </span>
                <ArrowRightLeftIcon className="w-6 h-6" />
                <span className="flex items-center gap-1">
                  <UsertourMappingIcon className="w-6 h-6" /> {usertourObject}
                </span>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'objects' &&
              (mode === 'edit'
                ? t('settings.integrations.objectMapping.dialog.descriptionEditMapping')
                : t('settings.integrations.objectMapping.dialog.descriptionSelectObjects'))}
            {step !== 'objects' &&
              mode === 'edit' &&
              t('settings.integrations.objectMapping.dialog.descriptionEditFields')}
          </DialogDescription>
        </DialogHeader>

        {step === 'objects' ? (
          <ObjectSelectionPanel
            salesforceObject={salesforceObject}
            usertourObject={usertourObject}
            onSalesforceObjectChange={setSalesforceObject}
            onUsertourObjectChange={setUsertourObject}
            onContinue={handleContinue}
            onCancel={handleClose}
            isLoading={isSaving}
          />
        ) : (
          <>
            <ObjectMappingPanel
              selectedBizType={selectedBizType}
              projectId={project?.id || ''}
              sourceFields={dynamicSalesforceFields}
              sourceObjectType={salesforceObject}
              targetObjectType={usertourObject}
              initialMapping={mappingData}
              onMappingChange={handleMappingChange}
            />

            {/* Stream events switch - business specific */}
            <div className="flex items-center gap-3 mb-4">
              <Switch
                className="data-[state=unchecked]:bg-input"
                checked={isSyncStream}
                onCheckedChange={setIsSyncStream}
              />
              <span
                // biome-ignore lint/security/noDangerouslySetInnerHtml: translated string; i18next escapes interpolated values by default
                dangerouslySetInnerHTML={{
                  __html: t('settings.integrations.objectMapping.streamSwitch')
                    .replace(/<user>/, '<span class="font-semibold text-primary">')
                    .replace(/<\/user>/, '</span>')
                    .replace(/<contact>/, '<span class="font-semibold text-blue-500">')
                    .replace(/<\/contact>/, '</span>'),
                }}
              />
              <InfoIcon className="w-4 h-4 text-muted-foreground" />
            </div>

            <DialogFooter>
              {mode === 'create' && (
                <Button variant="outline" onClick={handleBack} disabled={isSaving}>
                  {t('settings.integrations.objectMapping.dialog.backButton')}
                </Button>
              )}
              <Button onClick={handleSaveMapping} disabled={isSaving || !mappingData}>
                {isSaving && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'edit'
                  ? t('settings.integrations.objectMapping.dialog.updateMappingButton')
                  : t('settings.integrations.objectMapping.dialog.saveMappingButton')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
