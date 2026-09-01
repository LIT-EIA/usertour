'use client';

import { useAppContext } from '@/contexts/app-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useMutation } from '@apollo/client';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';

import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@usertour-packages/dropdown-menu';
import { updateSegment } from '@usertour-packages/gql';
import { cn, getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { useTranslation } from 'react-i18next';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  const { t } = useTranslation();
  const { refetch, currentSegment } = useSegmentListContext();
  const { isViewOnly } = useAppContext();

  const [mutation] = useMutation(updateSegment);
  const { toast } = useToast();
  const updateSegmentColumn = useCallback(
    async (name: string, value: boolean) => {
      if (!currentSegment) {
        return;
      }
      const data = {
        id: currentSegment.id,
        columns: { ...currentSegment.columns, [name]: value },
      };
      try {
        const ret = await mutation({ variables: { data } });
        if (ret.data?.updateSegment?.id) {
          await refetch();
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [currentSegment],
  );

  const columns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
          disabled={isViewOnly}
        >
          <MixerHorizontalIcon className="mr-2 h-4 w-4" />
          {t('contents.listView.viewOptions.view')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>{t('contents.listView.viewOptions.toggleColumns')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className={cn(columns.length > 10 ? 'h-80' : 'h-auto')}>
          {columns.map((column) => {
            const label = (column.columnDef.meta as { label?: string } | undefined)?.label;
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize cursor-pointer"
                checked={column.getIsVisible()}
                onCheckedChange={async (value) => {
                  column.toggleVisibility(!!value);
                  await updateSegmentColumn(column.id, !!value);
                }}
              >
                {label || column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
