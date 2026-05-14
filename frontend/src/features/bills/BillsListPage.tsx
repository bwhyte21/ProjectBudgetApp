import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TablePagination from "@mui/material/TablePagination";
import TableSortLabel from "@mui/material/TableSortLabel";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
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
import { BillFormDialog } from "./BillFormDialog";
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

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const formatDueDate = (iso: string) =>
  format(parseISO(iso.substring(0, 10) + "T00:00:00"), "MMM d, yyyy");

const formatLastPaidAt = (iso: string) =>
  format(parseISO(iso), "MMM d, yyyy h:mm a");

export function BillsListPage() {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((s) => s.bills);
  const { result: calcResult, status: calcStatus } = useAppSelector(
    (s) => s.calculation,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
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

  const tableData = useMemo(
    () =>
      items.map((b) => ({
        ...b,
        dueDate: nextDueById.get(b.id) ?? b.dueDate,
      })),
    [items, nextDueById],
  );

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = useCallback(
    (b: Bill) => {
      const original = items.find((item) => item.id === b.id) ?? b;
      setEditing(original);
      setDialogOpen(true);
    },
    [items],
  );
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

  const columns = useMemo<ColumnDef<Bill, unknown>[]>(() => {
    const ch = createColumnHelper<Bill>();
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
            <Chip
              size="small"
              variant="outlined"
              label={CATEGORY_LABELS[c] ?? "Unknown"}
              color={getCategoryChipColor(c)}
            />
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
      ch.accessor("dueDate", {
        header: "Due date",
        cell: (info) => {
          if (nextDueById.size === 0 && calcStatus === "loading") {
            return <CircularProgress size={14} />;
          }
          return formatDueDate(info.getValue());
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
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ justifyContent: "flex-end" }}
          >
            <IconButton
              size="small"
              onClick={() => openEdit(row.original)}
              aria-label="Edit"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(row.original.id)}
              aria-label="Delete"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      }),
    ] as ColumnDef<Bill, unknown>[];
  }, [nextDueById, calcStatus, openEdit, handleDelete]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card>
      <CardHeader
        title="Bills"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add bill
          </Button>
        }
      />
      <CardContent>
        {status === "loading" && <Typography>Loading...</Typography>}
        {items.length === 0 && status !== "loading" && (
          <Typography color="text.secondary">
            No bills yet. Add your first one.
          </Typography>
        )}
        {items.length > 0 && (
          <>
            <Table size="small">
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const align =
                        header.column.columnDef.meta?.align ?? "left";
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const headerContent = flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      );
                      return (
                        <TableCell
                          key={header.id}
                          align={align}
                          sortDirection={sorted === false ? false : sorted}
                        >
                          {canSort ? (
                            <TableSortLabel
                              active={sorted !== false}
                              direction={sorted === false ? "asc" : sorted}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {headerContent}
                            </TableSortLabel>
                          ) : (
                            headerContent
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const align = cell.column.columnDef.meta?.align ?? "left";
                      return (
                        <TableCell key={cell.id} align={align}>
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
            <TablePagination
              component="div"
              count={table.getRowCount()}
              page={pagination.pageIndex}
              onPageChange={(_, page) => table.setPageIndex(page)}
              rowsPerPage={pagination.pageSize}
              onRowsPerPageChange={(e) =>
                table.setPageSize(Number(e.target.value))
              }
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </CardContent>
      <BillFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
