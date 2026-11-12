import { createFileRoute } from "@tanstack/react-router";
import { publicBrand } from "@/lib/pulse/brand-public";

export const Route = createFileRoute("/api/brand")({
  server: {
    handlers: {
      GET: async () => Response.json(await publicBrand()),
    },
  },
});
