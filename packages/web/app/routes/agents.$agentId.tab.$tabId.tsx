import { useQuery } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useParams, useOutletContext, Link } from "react-router";
import { Loader2 } from "lucide-react";
import { TasksPage } from "~/components/pages/TasksPage";
import { NotesPage } from "~/components/pages/NotesPage";
import { SpreadsheetPage } from "~/components/pages/SpreadsheetPage";
import { MarkdownPage } from "~/components/pages/MarkdownPage";
import { PostgresPage } from "~/components/pages/PostgresPage";
import { ApiPage } from "~/components/pages/ApiPage";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";
import type { Id } from "@agent-maker/shared/convex/_generated/dataModel";

export default function DynamicTabPage() {
  const { tabId } = useParams();
  const { agent } = useOutletContext<{ agent: Doc<"agents"> }>();

  const tab = useQuery(api.sidebarTabs.get, {
    tabId: tabId as Id<"sidebarTabs">,
  });

  if (tab === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (tab === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Page not found</p>
          <Link
            to={`/agents/${agent._id}`}
            className="text-sm text-zinc-300 hover:text-zinc-100 underline underline-offset-4"
          >
            Back to agent
          </Link>
        </div>
      </div>
    );
  }

  switch (tab.type) {
    case "tasks":
      return <TasksPage tab={tab} />;
    case "notes":
      return <NotesPage tab={tab} />;
    case "spreadsheet":
      return <SpreadsheetPage tab={tab} />;
    case "markdown":
      return <MarkdownPage tab={tab} />;
    case "postgres":
      return <PostgresPage tab={tab} />;
    case "api":
      return <ApiPage tab={tab} />;
    default:
      return (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          Page type "{tab.type}" is not yet implemented
        </div>
      );
  }
}
