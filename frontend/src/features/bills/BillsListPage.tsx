import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  MessageSquare,
  Plus,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { createBill, deleteBill, fetchBills, updateBill } from "./billsSlice";
import { fetchCalculation } from "../calculation/calculationSlice";
import { BillDeleteDialog } from "./BillDeleteDialog";
import { BillFormDialog } from "./BillFormDialog";
import { BillNoteDialog } from "./BillNoteDialog";
import { format, parseISO } from "date-fns";
import type { Bill, BillInput } from "../../api/types";
import { CATEGORY_LABELS } from "../../api/categoryLabels";
import { getCategoryChipColor } from "./categoryChip";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right" | "center";
  }
}

type BillRow = Bill & { nextDueDate: string | null };

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const formatDueDate = (iso: string) =>
  format(parseISO(iso.substring(0, 10) + "T00:00:00"), "MMM d, yyyy");

const formatLastPaidAt = (iso: string) =>
  format(parseISO(iso), "MMM d, yyyy h:mm a");

const alignClass = (align: "left" | "right" | "center" | undefined) =>
  align === "right"
    ? "text-right"
    : align === "center"
      ? "text-center"
      : "text-left";

export function BillsListPage() {
  "use no memo";
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((s) => s.bills);
  const { result: calcResult, status: calcStatus } = useAppSelector(
    (s) => s.calculation,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [billPendingDelete, setBillPendingDelete] = useState<Bill | null>(null);
  const [noteBill, setNoteBill] = useState<Bill | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    dispatch(fetchBills());
    dispatch(fetchCalculation());
  }, [dispatch]);

  const nextDueById = useMemo(() => {
    const map = new Map<string, string>();
    calcResult?.rankedBills.forEach((r) => map.set(r.id, r.nextDueDate));
    return map;
  }, [calcResult]);

  const tableData = useMemo<BillRow[]>(
    () =>
      items.map((b) => ({
        ...b,
        nextDueDate: nextDueById.get(b.id) ?? null,
      })),
    [items, nextDueById],
  );

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = useCallback((b: Bill) => {
    setEditing(b);
    setDialogOpen(true);
  }, []);
  const handleSubmit = async (input: BillInput) => {
    if (editing) {
      await dispatch(updateBill({ id: editing.id, input })).unwrap();
    } else {
      await dispatch(createBill(input)).unwrap();
    }
    dispatch(fetchCalculation());
  };
  const handleDelete = useCallback(
    async (id: string) => {
      await dispatch(deleteBill(id)).unwrap();
      dispatch(fetchCalculation());
    },
    [dispatch],
  );
  const handleNoteSubmit = async (input: BillInput) => {
    if (!noteBill) return;
    await dispatch(updateBill({ id: noteBill.id, input })).unwrap();
    dispatch(fetchCalculation());
  };
  const handleConfirmDelete = useCallback(async () => {
    if (!billPendingDelete) return;
    await handleDelete(billPendingDelete.id);
    setBillPendingDelete(null);
  }, [billPendingDelete, handleDelete]);

  const columns = useMemo<ColumnDef<BillRow, unknown>[]>(() => {
    const ch = createColumnHelper<BillRow>();
    return [
      ch.accessor("name", {
        header: "Name",
        cell: (info) => info.getValue(),
      }),
      ch.accessor("category", {
        header: "Category",
        cell: (info) => {
          const c = info.getValue();
          return (
            <Badge variant="outline" className={cn(getCategoryChipColor(c))}>
              {CATEGORY_LABELS[c] ?? "Unknown"}
            </Badge>
          );
        },
      }),
      ch.accessor("monthlyAmountOwed", {
        header: "Monthly",
        cell: (info) => formatCurrency(info.getValue()),
        meta: { align: "right" },
      }),
      ch.accessor("totalBalance", {
        header: "Balance",
        cell: (info) => {
          const v = info.getValue();
          return v != null ? formatCurrency(v) : "-";
        },
        meta: { align: "right" },
      }),
      ch.accessor((r) => r.nextDueDate ?? r.dueDate, {
        id: "nextDueDate",
        header: "Due date",
        cell: (info) => {
          const v = info.getValue();
          if (v) return formatDueDate(v);
          if (calcStatus === "loading")
            return (
              <Loader2 className="ml-auto size-3.5 animate-spin text-muted-foreground" />
            );
          return "-";
        },
        meta: { align: "right" },
      }),
      ch.accessor("lastPaidAt", {
        header: "Last Paid",
        cell: (info) => {
          const v = info.getValue();
          return v ? formatLastPaidAt(v) : "-";
        },
        meta: { align: "right" },
      }),
      ch.display({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => openEdit(row.original)}
              aria-label="Edit"
            >
              <Pencil className="size-4" />
            </Button>
            {row.original.note ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setNoteBill(row.original)}
                    aria-label="Note"
                  >
                    <MessageSquare className="size-4 fill-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{row.original.note}</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setNoteBill(row.original)}
                aria-label="Note"
              >
                <MessageSquare className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setBillPendingDelete(row.original)}
              aria-label="Delete"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      }),
    ] as ColumnDef<BillRow, unknown>[];
  }, [calcStatus, openEdit]);

  const table = useReactTable<BillRow>({
    data: tableData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = table.getPageCount();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Bills</CardTitle>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add bill
        </Button>
      </CardHeader>
      <CardContent>
        {status === "loading" && <p>Loading...</p>}
        {items.length === 0 && status !== "loading" && (
          <p className="text-muted-foreground">
            No bills yet. Add your first one.
          </p>
        )}
        {items.length > 0 && (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const align = header.column.columnDef.meta?.align;
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const headerContent = flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      );
                      return (
                        <TableHead
                          key={header.id}
                          className={alignClass(align)}
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : undefined
                          }
                        >
                          {canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "inline-flex items-center gap-1 select-none hover:text-foreground",
                                align === "right" && "flex-row-reverse",
                              )}
                            >
                              {headerContent}
                              {sorted === "asc" ? (
                                <ChevronUp className="size-3.5" />
                              ) : sorted === "desc" ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronsUpDown className="size-3.5 opacity-50" />
                              )}
                            </button>
                          ) : (
                            headerContent
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
                      const align = cell.column.columnDef.meta?.align;
                      return (
                        <TableCell key={cell.id} className={alignClass(align)}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Rows per page</span>
                <Select
                  value={String(pagination.pageSize)}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger size="sm" className="w-[4.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-muted-foreground">
                Page {pagination.pageIndex + 1} of {Math.max(pageCount, 1)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <BillFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
      <BillNoteDialog
        key={noteBill?.id}
        open={noteBill !== null}
        bill={noteBill}
        onClose={() => setNoteBill(null)}
        onSubmit={handleNoteSubmit}
      />
      <BillDeleteDialog
        bill={billPendingDelete}
        onClose={() => setBillPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  );
}
