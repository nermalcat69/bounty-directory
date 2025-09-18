"use client";

import { useSession } from "@/lib/auth-client";
import { useState } from "react";
import { CreatePostModal } from "../modals/create-post-modal";
import { SignInModal } from "../modals/sign-in-modal";
import { Button } from "../ui/button";
import { BoardPost } from "./board-post";
// import { BoardSearch } from "./board-search";

type BoardListProps = {
  popularPosts: {
    post_id: number;
    has_voted: boolean;
    title: string;
    url: string;
    slug: string;
    content: string;
    created_at: string;
    vote_count: number;
    user_slug: string;
  }[];
};

export default function BoardList({ popularPosts }: BoardListProps) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [isOpen, setIsOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      setIsSignInModalOpen(true);
      return;
    }

    setIsOpen(true);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center w-full">
        <div>
          <h2 className="text-xl">Trending in Cursor</h2>
          <p className="text-sm text-[#878787] mt-1">
            Explore what the community is talking about
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full h-8 border-border"
          onClick={handleCreatePost}
        >
          Create Post
        </Button>
      </div>

      {/* <BoardSearch /> */}

      <div className="my-14 space-y-10">
        {popularPosts.map((post, index) => (
          <BoardPost key={post.post_id} {...post} />
        ))}
      </div>

      <CreatePostModal isOpen={isOpen} setIsOpen={setIsOpen} />
      <SignInModal
        redirectTo="/board"
        isOpen={isSignInModalOpen}
        setIsOpen={setIsSignInModalOpen}
      />
    </div>
  );
}
