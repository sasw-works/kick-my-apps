import { redirect } from "next/navigation";

// Tasks and Checklist became one page. Old links, bookmarks and emails still land in the right place.
export default function TasksMovedToChecklist() {
  redirect("/console/checklist");
}
