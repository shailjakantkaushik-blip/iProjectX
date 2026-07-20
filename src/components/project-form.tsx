import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface ProjectFormValues {
  project_code?: string | null;
  name: string;
  program?: string | null;
  sponsor?: string | null;
  bu_id?: string | null;
  priority?: string;
  status?: string;
  rag?: string;
  current_phase?: string | null;
  delivery_method?: string;
  start_date?: string | null;
  end_date?: string | null;
  target_go_live?: string | null;
  budget?: number;
  capex_approved?: number;
  capex_incurred?: number;
  opex_approved?: number;
  opex_incurred?: number;
  benefits_target?: number;
  benefits_realised?: number;
  roi_percent?: number;
  description?: string | null;
}

const OPTS = {
  priority: ["Low", "Medium", "High", "Critical"],
  status: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
  rag: ["Green", "Amber", "Red"],
  delivery: ["Waterfall", "Agile", "Hybrid"],
};

function toDateInput(v: string | null | undefined) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

export function ProjectForm({
  defaultValues,
  onSubmit,
  busy,
  submitLabel,
}: {
  defaultValues?: Partial<ProjectFormValues>;
  onSubmit: (v: ProjectFormValues) => void | Promise<void>;
  busy?: boolean;
  submitLabel: string;
}) {
  const { organization } = useAuth();
  const { data: bus = [] } = useQuery({
    queryKey: ["bus", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_units").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const { register, handleSubmit } = useForm<ProjectFormValues>({
    defaultValues: {
      priority: "Medium", status: "Not Started", rag: "Green", delivery_method: "Waterfall",
      ...defaultValues,
      start_date: toDateInput(defaultValues?.start_date),
      end_date: toDateInput(defaultValues?.end_date),
      target_go_live: toDateInput(defaultValues?.target_go_live),
    },
  });

  const submit = handleSubmit(async (v) => {
    const clean: ProjectFormValues = { ...v };
    for (const k of ["start_date","end_date","target_go_live"] as const) if (!clean[k]) clean[k] = null;
    for (const k of ["budget","capex_approved","capex_incurred","opex_approved","opex_incurred","benefits_target","benefits_realised","roi_percent"] as const) {
      const val = clean[k];
      clean[k] = val === undefined || val === null || (val as unknown as string) === "" ? 0 : Number(val);
    }
    if (clean.bu_id === "" || clean.bu_id === "none") clean.bu_id = null;
    await onSubmit(clean);
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project code"><Input {...register("project_code")} placeholder="PRJ-001" /></Field>
            <Field label="Name *"><Input {...register("name", { required: true })} /></Field>
            <Field label="Program"><Input {...register("program")} /></Field>
            <Field label="Sponsor"><Input {...register("sponsor")} /></Field>
            <Field label="Business Unit">
              <select {...register("bu_id")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="none">— None —</option>
                {bus.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Current Phase"><Input {...register("current_phase")} /></Field>
            <Sel label="Priority" reg={register("priority")} opts={OPTS.priority} />
            <Sel label="Status" reg={register("status")} opts={OPTS.status} />
            <Sel label="RAG" reg={register("rag")} opts={OPTS.rag} />
            <Sel label="Delivery Method" reg={register("delivery_method")} opts={OPTS.delivery} />
            <Field label="Start Date"><Input type="date" {...register("start_date")} /></Field>
            <Field label="End Date"><Input type="date" {...register("end_date")} /></Field>
            <Field label="Target Go-Live"><Input type="date" {...register("target_go_live")} /></Field>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Financials</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Budget"><Input type="number" step="0.01" {...register("budget")} /></Field>
              <Field label="CAPEX Approved"><Input type="number" step="0.01" {...register("capex_approved")} /></Field>
              <Field label="CAPEX Incurred"><Input type="number" step="0.01" {...register("capex_incurred")} /></Field>
              <Field label="OPEX Approved"><Input type="number" step="0.01" {...register("opex_approved")} /></Field>
              <Field label="OPEX Incurred"><Input type="number" step="0.01" {...register("opex_incurred")} /></Field>
              <Field label="ROI %"><Input type="number" step="0.01" {...register("roi_percent")} /></Field>
              <Field label="Benefits Target"><Input type="number" step="0.01" {...register("benefits_target")} /></Field>
              <Field label="Benefits Realised"><Input type="number" step="0.01" {...register("benefits_realised")} /></Field>
            </div>
          </div>

          <Field label="Description"><Textarea rows={4} {...register("description")} /></Field>

          <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Sel({ label, reg, opts }: { label: string; reg: ReturnType<ReturnType<typeof useForm>["register"]>; opts: string[] }) {
  return (
    <Field label={label}>
      <select {...reg} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}
