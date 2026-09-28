import { redirect } from "next/navigation";
import { auth } from "../../auth";
import ConsoleShell from "./ConsoleShell";

// The whole Console is for signed-in users only. This runs on the server, before anything is
// rendered, so a signed-out visitor is bounced to the home page (which opens the sign-in panel)
// without ever receiving Console markup. Data is protected separately: every API route checks the
// session too, so this redirect is convenience + defence in depth, not the only lock.
export default async function ConsoleLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect("/?signin=1");
  return <ConsoleShell>{children}</ConsoleShell>;
}
