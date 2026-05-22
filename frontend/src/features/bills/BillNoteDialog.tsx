import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Note for "{bill?.name}"</DialogTitle>
          <DialogDescription className="sr-only">
            Add or edit a note for this bill.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bill-note">Note</Label>
          <Textarea
            id="bill-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            autoFocus
            maxLength={MAX_NOTE_LENGTH}
          />
          <p className="text-sm text-muted-foreground">
            {note.length}/{MAX_NOTE_LENGTH}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
