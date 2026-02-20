"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type Column,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UnifiedCampaign } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toUpperCase();
  if (s === "IN_PROGRESS" || s === "ACTIVE") return "default";
  if (s === "PAUSED" || s === "DRAFT" || s === "DRAFTED") return "secondary";
  if (s === "FAILED" || s === "CANCELED" || s === "STOPPED")
    return "destructive";
  return "outline";
}

function platformLabel(platform: string) {
  return platform === "heyreach" ? "HeyReach" : "Smartlead";
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Column Definitions ─────────────────────────────────────────────────────

const columns: ColumnDef<UnifiedCampaign>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Campaign</SortableHeader>
    ),
    cell: ({ row }) => (
      <Link
        href={`/dashboard/campaigns/${row.original.id}`}
        className="text-primary font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "client",
    header: ({ column }) => (
      <SortableHeader column={column}>Client</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.client}
      </span>
    ),
  },
  {
    accessorKey: "platform",
    header: ({ column }) => (
      <SortableHeader column={column}>Platform</SortableHeader>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {platformLabel(row.original.platform)}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <SortableHeader column={column}>Status</SortableHeader>
    ),
    cell: ({ row }) => (
      <Badge variant={statusVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "totalLeads",
    accessorFn: (row) => row.leadStats?.totalUsers ?? null,
    header: ({ column }) => (
      <SortableHeader column={column}>Total Leads</SortableHeader>
    ),
    cell: ({ getValue }) => {
      const v = getValue<number | null>();
      return (
        <span className="font-medium">
          {v != null ? v.toLocaleString() : "—"}
        </span>
      );
    },
    meta: { align: "right" },
  },
  {
    id: "pending",
    accessorFn: (row) => row.leadStats?.totalUsersPending ?? null,
    header: ({ column }) => (
      <SortableHeader column={column}>Pending</SortableHeader>
    ),
    cell: ({ getValue }) => {
      const v = getValue<number | null>();
      return (
        <span className="text-yellow-600">
          {v != null ? v.toLocaleString() : "—"}
        </span>
      );
    },
    meta: { align: "right" },
  },
  {
    id: "inProgress",
    accessorFn: (row) => row.leadStats?.totalUsersInProgress ?? null,
    header: ({ column }) => (
      <SortableHeader column={column}>In Progress</SortableHeader>
    ),
    cell: ({ getValue }) => {
      const v = getValue<number | null>();
      return (
        <span className="text-blue-600">
          {v != null ? v.toLocaleString() : "—"}
        </span>
      );
    },
    meta: { align: "right" },
  },
  {
    id: "finished",
    accessorFn: (row) => row.leadStats?.totalUsersFinished ?? null,
    header: ({ column }) => (
      <SortableHeader column={column}>Finished</SortableHeader>
    ),
    cell: ({ getValue }) => {
      const v = getValue<number | null>();
      return (
        <span className="text-green-600">
          {v != null ? v.toLocaleString() : "—"}
        </span>
      );
    },
    meta: { align: "right" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <SortableHeader column={column}>Created</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDate(row.original.createdAt)}
      </span>
    ),
    sortingFn: (rowA, rowB) => {
      const a = new Date(rowA.original.createdAt).getTime();
      const b = new Date(rowB.original.createdAt).getTime();
      return a - b;
    },
  },
];

// ─── Sort Header Component ──────────────────────────────────────────────────

function SortableHeader({
  column,
  children,
}: {
  column: Column<UnifiedCampaign>;
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  );
}

// ─── Table Component ────────────────────────────────────────────────────────

interface CampaignTableProps {
  campaigns: UnifiedCampaign[];
  loading?: boolean;
  paginate?: boolean;
}

export function CampaignTable({
  campaigns,
  loading,
  paginate = true,
}: CampaignTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data: campaigns,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginate
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        No campaigns found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length} campaign
          {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {columnDisplayName(col.id)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const align = (header.column.columnDef.meta as { align?: string })?.align;
                return (
                  <TableHead
                    key={header.id}
                    className={align === "right" ? "text-right" : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const align = (cell.column.columnDef.meta as { align?: string })?.align;
                return (
                  <TableCell
                    key={cell.id}
                    className={align === "right" ? "text-right" : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {paginate && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-muted-foreground text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Column Display Names ───────────────────────────────────────────────────

function columnDisplayName(id: string): string {
  const names: Record<string, string> = {
    name: "Campaign",
    client: "Client",
    platform: "Platform",
    status: "Status",
    totalLeads: "Total Leads",
    pending: "Pending",
    inProgress: "In Progress",
    finished: "Finished",
    createdAt: "Created",
  };
  return names[id] ?? id;
}
