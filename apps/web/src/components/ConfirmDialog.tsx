import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/FormField';
import { errorMessage } from '@/lib/api';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** When set, the user must type this exact text to enable the action. */
  typeToConfirm?: string;
  onConfirm: () => Promise<unknown>;
};

/** Confirmation for destructive actions; stays open and reports errors on failure. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  typeToConfirm,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) setTyped('');
    onOpenChange(next);
  };

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      handleOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const blocked = typeToConfirm !== undefined && typed !== typeToConfirm;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {typeToConfirm !== undefined && (
          <FormField
            label={`Tapez « ${typeToConfirm} » pour confirmer`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={blocked || pending} onClick={confirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
