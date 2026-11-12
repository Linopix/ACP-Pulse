import { createFileRoute } from "@tanstack/react-router";
import { finishSpotify } from "@/lib/pulse/spotify-auth";

export const Route = createFileRoute("/api/spotify/callback")({
  server: {
    handlers: {
      GET: ({ request }) => finishSpotify(request),
    },
  },
});
