import { createFileRoute } from "@tanstack/react-router";
import { beginSpotify } from "@/lib/pulse/spotify-auth";

export const Route = createFileRoute("/api/spotify/start")({
  server: {
    handlers: {
      GET: ({ request }) => beginSpotify(request),
    },
  },
});
