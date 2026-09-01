import { Skeleton } from '@usertour-packages/skeleton';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useTranslation } from 'react-i18next';

// Skeleton for individual segment item
export const UserSegmentItemSkeleton = () => {
  return (
    <AdminSidebarBodyItemTemplate variant="ghost" className="cursor-default">
      <Skeleton className="h-4 w-4 mr-1" /> {/* Icon skeleton */}
      <Skeleton className="h-4 w-32" /> {/* Segment name skeleton */}
    </AdminSidebarBodyItemTemplate>
  );
};

// Skeleton for the segment list section only
export const UserSegmentListSkeleton = () => {
  const { t } = useTranslation();
  return (
    <AdminSidebarBodyTemplate>
      <AdminSidebarBodyTitleTemplate>{t('users.sidebar.segments')}</AdminSidebarBodyTitleTemplate>
      {Array.from({ length: 5 }, (_, index) => (
        <UserSegmentItemSkeleton key={index} />
      ))}
    </AdminSidebarBodyTemplate>
  );
};
