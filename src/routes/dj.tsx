import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Desk } from "@/components/pulse-dj";
import { AuthSkeleton, StudioIntro, useHydrated } from "@/components/pulse-landing";

export const Route = createFileRoute("/dj")({ component: DjPage });

function DjPage() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = useHydrated();
  if (!hydrated || isPending) {
    return (
      <StudioIntro>
        <AuthSkeleton />
      </StudioIntro>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <Desk />;
}
