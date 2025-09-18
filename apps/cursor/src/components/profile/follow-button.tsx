"use client";

import { toggleFollowAction } from "@/actions/toggle-follow-action";
import { useSession } from "@/lib/auth-client";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { SignInModal } from "../modals/sign-in-modal";
import { Button } from "../ui/button";

type Props = {
  slug: string;
  id: string;
};

export function FollowButton({ slug, id }: Props) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const followAction = useAction(toggleFollowAction);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchIsFollowing = async () => {
      if (!session?.user?.id) {
        setIsFollowing(false);
        return;
      }

      // TODO: Replace with proper database query using Drizzle
      // For now, we'll disable the follow functionality
      setIsFollowing(false);
    };

    fetchIsFollowing();
  }, [id, session?.user?.id]);

  const handleFollow = () => {
    if (!isAuthenticated) {
      setIsSignInModalOpen(true);
      return;
    }

    followAction.execute({
      userId: id,
      action: isFollowing ? "unfollow" : "follow",
      slug,
    });

    setIsFollowing(!isFollowing);
  };

  return (
    <>
      <Button
        className="rounded-full"
        onClick={handleFollow}
        variant={isFollowing ? "outline" : "default"}
        disabled={followAction.isExecuting}
      >
        {isFollowing ? "Following" : "Follow"}
      </Button>
      <SignInModal
        redirectTo={`/u/${slug}`}
        isOpen={isSignInModalOpen}
        setIsOpen={setIsSignInModalOpen}
      />
    </>
  );
}
