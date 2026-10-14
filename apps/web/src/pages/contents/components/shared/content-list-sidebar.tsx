import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useContentListContext } from '@/contexts/content-list-context';
import { FileEditLineIcon, BaseStationLineIcon } from '@usertour-packages/icons';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function ContentListSidebar() {
  const { query, setQuery } = useContentListContext();
  const { contentType } = useParams();
  const [_, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  // Extract common styles and logic
  const getItemClassName = (isActive: boolean) =>
    isActive ? 'bg-gray-200/40 dark:bg-secondary/60' : '';

  const titles: Record<string, string> = {
    flows: t('contents.list.flows.title'),
    content: t('contents.list.flows.title'),
    launchers: t('contents.list.launchers.title'),
    checklists: t('contents.list.checklists.title'),
    banners: t('contents.list.banners.title'),
    nps: 'NPS',
  };
  const title = (contentType && titles[contentType]) || '';

  const handleStatusChange = (published: boolean) => () => {
    setQuery({ published });
    setSearchParams({});
  };

  return (
    <AdminSidebarContainerTemplate heading={title}>
      <AdminSidebarHeaderTemplate>
        <p aria-hidden="true" className="text-2xl font-semibold">
          {title}
        </p>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>
          {t('contents.shared.sidebar.status')}
        </AdminSidebarBodyTitleTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(false)}
          variant={query.published === false ? 'secondary' : 'ghost'}
          className={getItemClassName(query.published === false)}
        >
          <FileEditLineIcon className="w-4 h-4 mr-1" />
          {t('contents.shared.sidebar.draft')}
        </AdminSidebarBodyItemTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(true)}
          variant={query.published === true ? 'secondary' : 'ghost'}
          className={getItemClassName(query.published === true)}
        >
          <BaseStationLineIcon className="w-4 h-4 mr-1" />
          {t('contents.shared.sidebar.published')}
        </AdminSidebarBodyItemTemplate>
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
}

ContentListSidebar.displayName = 'ContentListSidebar';
