import { createFileRoute } from "@tanstack/react-router";
import { beginMicrosoft } from "@/lib/pulse/microsoft";

export const Route = createFileRoute("/api/microsoft/start")({
  server: {
    handlers: {
      GET: ({ request }) => beginMicrosoft(request),
    },
  },
});
