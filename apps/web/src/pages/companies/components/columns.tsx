'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@usertour-packages/checkbox';

import { formatDate } from '@/utils/common';
import { BizCompany } from '@usertour/types';
import { DataTableColumnHeader } from './data-table-column-header';
import { UserAvatar } from '@/components/molecules/user-avatar';
import type { TFunction } from 'i18next';

export const getColumns = (t: TFunction): ColumnDef<BizCompany>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title={t('companies.columns.id')} />,
    cell: ({ row }) => <div className="px-2">{row.getValue('id')}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'externalId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('companies.columns.company')} />
    ),
    cell: ({ row }) => {
      const email = row.original.data?.email || '';
      const name = row.original.data?.name || '';

      return (
        <div className="px-2 flex items-center gap-2">
          <UserAvatar email={email} name={name} size="sm" />
          <span>{row.getValue('externalId')}</span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  // {
  //   accessorKey: "environmentId",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="environmentId" />
  //   ),
  //   cell: ({ row }) => <div className="w-[80px]">{row.getValue("environmentId")}</div>,
  //   enableSorting: false,
  //   enableHiding: true,
  // },
  // {
  //   accessorKey: "createdAt",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="createdAt" />
  //   ),
  //   cell: ({ row }) => {

  //     return (
  //       <div className="flex space-x-2">
  //         <span className="max-w-[500px] truncate font-medium">
  //           {row.getValue("createdAt")}
  //         </span>
  //       </div>
  //     )
  //   },
  // },
  // {
  //   id: "actions",
  //   cell: ({ row }) => <DataTableRowActions row={row} />,
  // },
];

export const getColumnsSystem = (t: TFunction): ColumnDef<BizCompany>[] => [
  {
    accessorKey: 'environmentId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('companies.columns.environmentId')} />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue('environmentId')}</div>,
    meta: { label: t('companies.columns.environmentId') },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('companies.columns.createdAt')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {formatDate(new Date(row.getValue('createdAt')), 'PPpp')}
          </span>
        </div>
      );
    },
    meta: { label: t('companies.columns.createdAt') },
  },
];
