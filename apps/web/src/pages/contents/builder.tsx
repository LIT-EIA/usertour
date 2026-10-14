import { useAppContext } from '@/contexts/app-context';
import { useParams } from 'react-router-dom';
import { ContentDetailBuilder } from './components/detail/content-detail-builder';
import { ContentLoading } from '@/components/molecules/content-loading';
import { useTranslation } from 'react-i18next';

export const ContentBuilder = () => {
  const { contentId = '', contentType, versionId } = useParams();
  const { project, environment } = useAppContext();
  const { t } = useTranslation();
  if (!project || !project.id || !contentId || !versionId || !environment || !contentType) {
    return <ContentLoading message="Loading builder..." />;
  }

  return (
    <>
      {/* The builder has no visible page heading, so provide one for assistive tech (WCAG 1.3.1) */}
      <h1 className="sr-only">
        {t(`contents.list.${contentType}.title`, contentType)} - {t('pageTitles.builder')}
      </h1>
      <ContentDetailBuilder
        contentId={contentId}
        versionId={versionId}
        projectId={project?.id}
        environmentId={environment.id}
        envToken={environment.token}
        contentType={contentType}
      />
    </>
  );
};

ContentBuilder.displayName = 'ContentBuilder';
