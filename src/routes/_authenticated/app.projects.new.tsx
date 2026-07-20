import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdmin } from "@/lib/auth-context";
import { ProjectForm, type ProjectFormValues } from "@/components/project-form";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/app/projects/new")({
  component: NewProject,
});

function NewProject() {
  const { organization, roles } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin(roles)) navigate({ to: "/app/projects", replace: true });
  }, [roles, navigate]);

  const submit = async (values: ProjectFormValues) => {
    if (!organization) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...values, org_id: organization.id } as never)
      .select("id")
      .single();
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Project created");
    navigate({ to: "/app/projects/$id", params: { id: (data as { id: string }).id } });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">New Project</h1>
      <ProjectForm onSubmit={submit} busy={busy} submitLabel="Create project" />
    </div>
  );
}
