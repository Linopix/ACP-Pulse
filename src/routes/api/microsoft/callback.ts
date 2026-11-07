import { createFileRoute } from "@tanstack/react-router";
import { finishMicrosoft } from "@/lib/pulse/microsoft";

export const Route = createFileRoute("/api/microsoft/callback")({
  server: {
    handlers: {
      GET: ({ request }) => finishMicrosoft(request),
    },
  },
});
