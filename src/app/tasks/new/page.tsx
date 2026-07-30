import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const errors: Record<string, string> = {
  invalid_task: "Enter a title for the work item.",
  unavailable: "The work item could not be saved. Check your access and try again.",
};

export default async function NewTaskPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string; client?: string }> }>) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;

  const workspace = await getCurrentWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data: clientRows } = workspace
    ? await supabase
      .from("clients")
      .select("id, display_name")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .order("display_name")
    : { data: [] };

  const clients = clientRows ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Review queue"
        title="Add a work item"
        description="Add a task to the review queue. Link it to a client, set its priority, and give it a deadline the queue can rank."
      />
      <form className="record-form" action="/api/tasks" method="post">
        <div className="record-form-field">
          <label htmlFor="task-title">What needs to be done</label>
          <input
            id="task-title"
            name="title"
            required
            type="text"
            defaultValue=""
            placeholder="Verify GSTR-3B liability before filing"
          />
        </div>
        <div className="record-form-field">
          <label htmlFor="task-client">Client</label>
          <select id="task-client" name="clientId" defaultValue={params.client ?? ""}>
            <option value="">Firm-wide (no client)</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.display_name}</option>
            ))}
          </select>
          <small>Link the item to a client so it shows on the client workspace too.</small>
        </div>
        <div className="record-form-field">
          <label htmlFor="task-priority">Priority</label>
          <select id="task-priority" name="priority" defaultValue="2">
            <option value="3">High — needs a decision soon</option>
            <option value="2">Medium</option>
            <option value="1">Low</option>
          </select>
        </div>
        <div className="record-form-field">
          <label htmlFor="task-due">Deadline</label>
          <input id="task-due" name="dueDate" type="date" />
          <small>Optional. Items with a deadline are ranked by how soon they are due.</small>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="button-row">
          <button className="button primary" type="submit">Add to queue</button>
          <Link className="button" href="/today">Cancel</Link>
        </div>
      </form>
    </>
  );
}
