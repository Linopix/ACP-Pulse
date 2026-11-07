import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AuthCard, AuthSkeleton, StudioIntro, useHydrated } from "@/components/pulse-landing";
import { Station } from "@/components/pulse-station";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = useHydrated();
  if (!hydrated || isPending || !user) {
    return <StudioIntro>{!hydrated || isPending ? <AuthSkeleton /> : <AuthCard />}</StudioIntro>;
  }
  return <Station />;
}
