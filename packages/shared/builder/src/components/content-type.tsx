import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { Alert, AlertDescription, AlertTitle } from '@usertour-packages/alert';
import { EyeNoneIcon, ModelIcon, TooltipIcon } from '@usertour-packages/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { useTranslation } from 'react-i18next';

interface ContentTypeProps {
  type: string;
  onChange: (value: string) => void;
  zIndex: number;
}

export const ContentType = ({ onChange, zIndex, type }: ContentTypeProps) => {
  const { t } = useTranslation();

  const getLabel = (value: string) => {
    switch (value) {
      case 'tooltip':
        return t('contentBuilder.flow.stepType.tooltip');
      case 'modal':
        return t('contentBuilder.flow.stepType.modal');
      case 'hidden':
        return t('contentBuilder.flow.stepType.hidden');
      default:
        return value;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">{t('contentBuilder.flow.stepTypeTitle')}</h1>
      </div>

      <Select value={type} onValueChange={onChange}>
        <SelectTrigger className="h-8 justify-start">
          {type === 'tooltip' && <TooltipIcon className="w-4 h-4 mr-2 mt-0.5 flex-none" />}
          {type === 'modal' && <ModelIcon className="w-4 h-4 mr-2 mt-0.5 flex-none" />}
          {type === 'hidden' && <EyeNoneIcon className="w-4 h-4 mr-2 flex-none" />}

          <div className="grow text-left">
            <SelectValue asChild>
              <div className="capitalize">{getLabel(type)}</div>
            </SelectValue>
          </div>
        </SelectTrigger>

        <SelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          <SelectItem value="tooltip">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <TooltipIcon width={16} height={16} className="mt-0.5" />
                <span className="text-xs">{t('contentBuilder.flow.stepType.tooltip')}</span>
              </div>
              <p className="text-xs max-w-60">
                {t('contentBuilder.flow.stepType.tooltipDescription')}
              </p>
            </div>
          </SelectItem>

          <SelectItem value="modal">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <ModelIcon width={16} height={16} className="mt-0.5" />
                <span className="text-xs">{t('contentBuilder.flow.stepType.modal')}</span>
              </div>
              <p className="text-xs max-w-60">
                {t('contentBuilder.flow.stepType.modalDescription')}
              </p>
            </div>
          </SelectItem>
          <SelectItem value="hidden">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <EyeNoneIcon width={16} height={16} />
                <span className="text-xs">{t('contentBuilder.flow.stepType.hidden')}</span>
              </div>
              <p className="text-xs max-w-60">
                {t('contentBuilder.flow.stepType.hiddenDescription')}
              </p>
            </div>
          </SelectItem>
        </SelectContent>

        {type === 'hidden' && (
          <Alert variant="warning">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>{t('contentBuilder.flow.hiddenWarningTitle')}</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{t('contentBuilder.flow.hiddenWarning1')}</span>
              <span>{t('contentBuilder.flow.hiddenWarning2')}</span>
              <span>{t('contentBuilder.flow.hiddenWarning3')}</span>
            </AlertDescription>
          </Alert>
        )}
      </Select>
    </div>
  );
};
ContentType.displayName = 'ContentType';
