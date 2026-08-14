import { Button } from '@usertour-packages/button';
import { useTranslation } from 'react-i18next';

interface ElementPreviewProps {
  onClick: () => void;
  previewImageUrl?: string;
  title?: string;
}

export const ElementPreview = ({ onClick, previewImageUrl, title }: ElementPreviewProps) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('contentBuilder.launcher.placementSubtitle');

  return (
    <section className="space-y-3">
      <header className="flex justify-between items-center">
        <h2 className="text-sm">{t('contentBuilder.launcher.target')}</h2>
      </header>

      <Button
        className="w-full flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 cursor-pointer"
        onClick={onClick}
      >
        <div className="space-y-2">
          <h3 className="text-sm">{resolvedTitle}</h3>
          <div className="rounded-2xl overflow-hidden">
            {previewImageUrl ? (
              <div className="w-[242px] h-[130px] overflow-hidden">
                <img src={previewImageUrl} alt={`Preview for ${resolvedTitle}`} />
              </div>
            ) : (
              <p className="text-destructive text-sm">
                {t('contentBuilder.launcher.noElementSelected')}
              </p>
            )}
          </div>
        </div>
      </Button>
    </section>
  );
};

ElementPreview.displayName = 'ElementPreview';
