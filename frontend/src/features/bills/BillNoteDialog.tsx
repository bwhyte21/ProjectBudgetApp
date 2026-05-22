import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import type { Bill, BillInput } from "../../api/types";

const MAX_NOTE_LENGTH = 500;

interface Props {
  open: boolean;
  bill: Bill | null;
  onClose: () => void;
  onSubmit: (input: BillInput) => Promise<void>;
}

export function BillNoteDialog({ open, bill, onClose, onSubmit }: Props) {
  const [note, setNote] = useState(bill?.note ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!bill) return;
    setSubmitting(true);
    try {
      const trimmed = note.trim();
      await onSubmit({
        name: bill.name,
        monthlyAmountOwed: bill.monthlyAmountOwed,
        totalBalance: bill.totalBalance ?? null,
        dueDate: bill.dueDate.substring(0, 10),
        category: bill.category,
        minimumPayment: bill.minimumPayment ?? null,
        note: trimmed === "" ? null : trimmed,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Note for "{bill?.name}"</DialogTitle>
      <DialogContent>
        <TextField
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={3}
          maxRows={8}
          autoFocus
          fullWidth
          margin="dense"
          slotProps={{ htmlInput: { maxLength: MAX_NOTE_LENGTH } }}
          helperText={`${note.length}/${MAX_NOTE_LENGTH}`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={submitting}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
