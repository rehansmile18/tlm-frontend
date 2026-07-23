"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { assignmentsApi, type UpdateAssignmentBody } from "@/lib/resources";
import { useTranslation } from "@/lib/i18n/i18n";
import { humanizeError } from "@/components/data-state";
import { toDateInput } from "@/lib/format";
import { ASSIGNMENT_STATUSES, type Assignment, type AssignmentStatus } from "@/lib/types";

function EditForm({ assignment, onDone }: { assignment: Assignment; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [targetIdsText, setTargetIdsText] = useState(assignment.targetIds.join(", "));
  const [priority, setPriority] = useState(String(assignment.priority));
  const [effectiveFrom, setEffectiveFrom] = useState(toDateInput(assignment.effectiveFrom));
  const [effectiveTo, setEffectiveTo] = useState(toDateInput(assignment.effectiveTo));
  const [status, setStatus] = useState<AssignmentStatus>(assignment.status);

  const mutation = useMutation({
    mutationFn: () => {
      const body: UpdateAssignmentBody = {
        targetIds: targetIdsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => (assignment.targetType === "STATE" ? s.toUpperCase() : s)),
        priority: Number(priority) || 0,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        status,
      };
      return assignmentsApi.update(assignment._id, body);
    },
    onSuccess: () => {
      toast.success(t("assignments.toastUpdated"));
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assignment", assignment._id] });
      onDone();
    },
    onError: (error) => toast.error(t("assignments.couldntUpdate"), { description: humanizeError(error) }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!targetIdsText.trim()) return toast.error(t("assignments.addAtLeastOneTargetId"));
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="eTargets">
          {t("assignments.targets")} ({t(`targetTypes.${assignment.targetType}`)})
        </Label>
        <Input id="eTargets" value={targetIdsText} onChange={(e) => setTargetIdsText(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t("assignments.cantChangeAfterCreate")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ePriority">{t("assignments.priority")}</Label>
          <Input id="ePriority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eStatus">{t("assignments.status")}</Label>
          <Combobox id="eStatus" value={status} onValueChange={(v) => setStatus(v as AssignmentStatus)}>
            {ASSIGNMENT_STATUSES.map((s) => (
              <ComboboxItem key={s} value={s}>
                {t(`assignmentStatus.${s}`)}
              </ComboboxItem>
            ))}
          </Combobox>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eFrom">{t("assignments.effectiveFrom")}</Label>
          <Input id="eFrom" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eTo">{t("assignments.effectiveTo")}</Label>
          <Input id="eTo" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {t("assignments.saveChanges")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AssignmentEditDialog({
  open,
  onOpenChange,
  assignment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("assignments.editDialogTitle")}</DialogTitle>
          <DialogDescription>{t("assignments.editDialogDescription")}</DialogDescription>
        </DialogHeader>
        {open ? <EditForm key={assignment._id} assignment={assignment} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
