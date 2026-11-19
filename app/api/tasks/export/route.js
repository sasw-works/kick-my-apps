import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";
import { computeProjectTasks } from "../../../lib/projects";
import { loadProjects, loadStatusMap, loadCustomTasks } from "../../../lib/taskData";
import { tasksToCsv, tasksToMarkdown, tasksToLinearCsv, tasksToJiraCsv, tasksToGithubScript, exportFileName } from "../../../lib/taskExport";

export const runtime = "nodejs";

const FORMATS = {
  md: { type: "text/markdown; charset=utf-8", ext: "md", build: (a, t, v) => tasksToMarkdown(a, t, v) },
  csv: { type: "text/csv; charset=utf-8", ext: "csv", build: (a, t, v) => tasksToCsv(a, t, v) },
  linear: { type: "text/csv; charset=utf-8", ext: "csv", suffix: "linear-import", build: (a, t) => tasksToLinearCsv(a, t) },
  jira: { type: "text/csv; charset=utf-8", ext: "csv", suffix: "jira-import", build: (a, t) => tasksToJiraCsv(a, t) },
  github: { type: "text/x-shellscript; charset=utf-8", ext: "sh", suffix: "github-issues", build: (a, t) => tasksToGithubScript(a, t) },
};

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
    if (!FORMATS[format]) {
      return Response.json({ error: "format must be md, csv, linear, jira or github." }, { status: 400 });
    }
    const projects = await loadProjects(user.email);
    const project = projects.find((p) => p.key === sp.get("project"));
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

    const { tasks, verified } = computeProjectTasks(project.scans, await loadStatusMap(user.email, project.key), await loadCustomTasks(user.email, project.key));
    const f = FORMATS[format];
    const body = f.build(project.appName, tasks, verified);
    return new Response(body, {
      headers: {
        "Content-Type": f.type,
        "Content-Disposition": `attachment; filename="${exportFileName(project.appName, f.ext, f.suffix)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not export: " + errorText(err) }, { status: 500 });
  }
}
