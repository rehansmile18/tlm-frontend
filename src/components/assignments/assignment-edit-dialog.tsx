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
import { NativeSelect } from "@/components/ui/native-select";
import { assignmentsApi, type UpdateAssignmentBody } from "@/lib/resources";
import { humanizeError } from "@/components/data-state";
import { toDateInput } from "@/lib/format";
import { ASSIGNMENT_STATUSES, type Assignment, type AssignmentStatus } from "@/lib/types";

function EditForm({ assignment, onDone }: { assignment: Assignment; onDone: () => void }) {
  const queryClient = useQueryClient();
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
      toast.success("Assignment updated");
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assignment", assignment._id] });
      onDone();
    },
    onError: (error) => toast.error("Couldn't update assignment", { description: humanizeError(error) }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!targetIdsText.trim()) return toast.error("Add at least one target ID");
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="eTargets">Targets ({assignment.targetType.toLowerCase()})</Label>
        <Input id="eTargets" value={targetIdsText} onChange={(e) => setTargetIdsText(e.target.value)} />
        <p className="text-xs text-muted-foreground">Comma-separated. Target type and rule group can&apos;t be changed after creation.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ePriority">Priority</Label>
          <Input id="ePriority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eStatus">Status</Label>
          <NativeSelect id="eStatus" value={status} onChange={(e) => setStatus(e.target.value as AssignmentStatus)}>
            {ASSIGNMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eFrom">Effective from</Label>
          <Input id="eFrom" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eTo">Effective to (optional)</Label>
          <Input id="eTo" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Save changes
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit assignment</DialogTitle>
          <DialogDescription>Update the population, priority, effective window, or status.</DialogDescription>
        </DialogHeader>
        {open ? <EditForm key={assignment._id} assignment={assignment} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
