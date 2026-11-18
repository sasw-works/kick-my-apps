import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";
import { computeProjectTasks } from "../../../lib/projects";
import { loadProjects, loadStatusMap } from "../../../lib/taskData";
import { tasksToCsv, tasksToMarkdown, exportFileName } from "../../../lib/taskExport";

export const runtime = "nodejs";

// GET /api/tasks/export?project=<key>&format=md|csv -> a file download of the caller's own
// project's to-do list. Same ownership rules as /api/tasks: you only ever get your own data.
export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`tasks-export:${user.id}`, { limit: 60, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    const sp = new URL(req.url).searchParams;
    const format = sp.get("format");
    if (format !== "md" && format !== "csv") {
      return Response.json({ error: "format must be md or csv." }, { status: 400 });
    }
    const projects = await loadProjects(user.email);
    const project = projects.find((p) => p.key === sp.get("project"));
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

    const { tasks, verified } = computeProjectTasks(project.scans, await loadStatusMap(user.email, project.key));
    const body = format === "csv" ? tasksToCsv(project.appName, tasks, verified) : tasksToMarkdown(project.appName, tasks, verified);
    return new Response(body, {
      headers: {
        "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFileName(project.appName, format)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not export: " + errorText(err) }, { status: 500 });
  }
}
