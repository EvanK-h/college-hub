import { permanentRedirect } from "next/navigation";

// The prerequisite graph moved onto the Pathway page as its Graph view (see the 2026-10-29
// decision); this keeps old links and bookmarks working.
export default function GraphPage() {
  permanentRedirect("/pathway?view=graph");
}
