import { Skeleton } from '@usertour-packages/skeleton';
import {
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useTranslation } from 'react-i18next';

// Skeleton for individual segment item
export const UserSegmentItemSkeleton = () => {
  return (
    // Presentational placeholder: a <div>, not a <button>, so it is not an empty focusable control
    <div aria-hidden="true" className="flex items-center w-full h-8 rounded-md px-2">
      <Skeleton className="h-4 w-4 mr-1" /> {/* Icon skeleton */}
      <Skeleton className="h-4 w-32" /> {/* Segment name skeleton */}
    </div>
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
