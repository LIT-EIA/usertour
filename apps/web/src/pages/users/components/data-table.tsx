'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { Skeleton } from '@usertour-packages/skeleton';
import { BizUser, Segment, UserAttributes } from '@usertour/types';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { getColumns, getColumnsSystem } from '../components/columns';
import { DataTablePagination } from '../components/data-table-pagination';
import { DataTableToolbar } from '../components/data-table-toolbar';
import { DataTableColumnHeader } from './data-table-column-header';
import { formatAttributeValue } from '@/utils/common';

// Built-in user attributes ship with an English displayName from the backend;
// translate those known codeNames instead of showing the raw DB value.
const SYSTEM_ATTRIBUTE_COLUMN_KEYS: Partial<Record<string, string>> = {
  [UserAttributes.EMAIL]: 'users.columns.email',
  [UserAttributes.NAME]: 'users.columns.name',
  [UserAttributes.FIRST_SEEN_AT]: 'users.columns.firstSeen',
  [UserAttributes.LAST_SEEN_AT]: 'users.columns.lastSeen',
  [UserAttributes.SIGNED_UP_AT]: 'users.columns.signedUp',
};

const getAttributeDisplayName = (
  t: TFunction,
  attribute: { codeName: string; displayName: string },
) => {
  const translationKey = SYSTEM_ATTRIBUTE_COLUMN_KEYS[attribute.codeName];
  return translationKey ? t(translationKey) : attribute.displayName || attribute.codeName;
};

interface TableProps {
  published: boolean;
  segment: Segment;
}

export function DataTable({ segment }: TableProps) {
  const { t } = useTranslation();
  const columns = React.useMemo(() => getColumns(t), [t]);
  const columnsSystem = React.useMemo(() => getColumnsSystem(t), [t]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [customColumns, setCustomColumns] = React.useState<typeof columns>(columns);
  const { setQuery, setPagination, pagination, pageCount, contents, loading, isRefetching } =
    useUserListContext();
  const { attributeList } = useAttributeListContext();
  const navigate = useNavigate();

  React.useEffect(() => {
    setQuery({ segmentId: segment.id });
  }, [segment]);

  React.useEffect(() => {
    const attrList = attributeList?.filter((attr) => attr.bizType === 1);
    if (attrList && attrList?.length > 0) {
      const _customColumns: ColumnDef<BizUser>[] = [];
      const _columnVisibility: VisibilityState = {
        environmentId: false,
        id: false,
      };
      for (const attribute of attrList) {
        const displayName = getAttributeDisplayName(t, attribute);
        _columnVisibility[attribute.codeName] = !!segment.columns?.[attribute.codeName];
        _customColumns.push({
          accessorFn: (row) => {
            const data = row.data as any;
            return data?.[attribute.codeName];
          },
          id: attribute.codeName,
          header: ({ column }) => <DataTableColumnHeader column={column} title={displayName} />,
          cell: ({ row }) => {
            const value = row.getValue(attribute.codeName);
            return <div className="px-2">{formatAttributeValue(value)}</div>;
          },
          meta: { label: displayName },
          enableSorting: false,
          enableHiding: true,
        });
      }
      setCustomColumns([...columns, ...columnsSystem, ..._customColumns]);
      setColumnVisibility({ ..._columnVisibility });
    }
  }, [attributeList, segment.columns, columns, columnsSystem, t]);

  const handlerOnClick = (environmentId: string, id: string) => {
    navigate(`/env/${environmentId}/user/${id}`);
  };

  const table = useReactTable({
    data: contents,
    columns: customColumns as ColumnDef<BizUser>[],
    pageCount,
    manualPagination: true,
    state: {
      sorting,
      pagination,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-2">
      <DataTableToolbar table={table} currentSegment={segment} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading || isRefetching ? (
              // Show loading skeleton using Skeleton component
              Array.from({ length: pagination.pageSize }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {customColumns.map((_, colIndex) => (
                    <TableCell key={`loading-cell-${index}-${colIndex}`} className="h-12">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="leading-8"
                      onClick={() => {
                        if (cell.column.id !== 'select') {
                          handlerOnClick(row.getValue('environmentId'), row.getValue('id'));
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={customColumns.length} className="h-24 text-center">
                  {t('dataTable.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
