import { ListSkeleton } from '@/components/molecules/skeleton';
import { useEventListContext } from '@/contexts/event-list-context';
import { Event } from '@usertour/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { formatDate as format } from '@/utils/common';
import { useTranslation } from 'react-i18next';
import { EventListAction } from './event-list-action';

export const EventListContent = () => {
  const { eventList, loading, isRefetching } = useEventListContext();
  const { t } = useTranslation();

  if (loading || isRefetching) {
    return <ListSkeleton />;
  }

  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('settings.events.columns.displayName')}</TableHead>
              <TableHead>{t('settings.events.columns.codeName')}</TableHead>
              <TableHead>{t('settings.events.columns.createdAt')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventList ? (
              eventList?.map((event: Event) => (
                <TableRow className="cursor-pointer" key={event.id} onClick={() => {}}>
                  <TableCell className={event.description ? 'flex flex-col' : ''}>
                    {event.displayName}
                    {event.description && (
                      <span className="text-xs text-gray-500">{event.description}</span>
                    )}
                  </TableCell>
                  <TableCell>{event.codeName}</TableCell>
                  <TableCell>{format(new Date(event.createdAt), 'PPpp')}</TableCell>
                  <TableCell>
                    <EventListAction event={event} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center">{t('dataTable.noResults')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

EventListContent.displayName = 'EventListContent';
