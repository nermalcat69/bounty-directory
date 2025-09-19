"use client";

import { signOut, useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryStates } from "nuqs";
import { parseAsBoolean } from "nuqs";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { GithubSignin } from "./github-signin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";

export function UserMenu() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [_, setQueryStates] = useQueryStates({
    addCompany: parseAsBoolean.withDefault(false),
    redirect: parseAsBoolean.withDefault(false),
  });

  const handleSignOut = async () => {
    await signOut();
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="size-6 rounded-none" />
      </div>
    );
  }

  const user = session?.user;

  if (!isClient) {
    return (
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Avatar className="size-6 rounded-none cursor-pointer">
                  <AvatarImage src={user?.image || ""} className="rounded-none" />
                  <AvatarFallback className="text-xs bg-[#878787]">
                    {user?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-32"
                side="bottom"
                sideOffset={8}
              >
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    onClick={() =>
                      setQueryStates({ addCompany: true, redirect: true })
                    }
                    className="w-full text-left"
                  >
                    Add Company
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/jobs/new">Post a job</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <GithubSignin />
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-4"
    >
      {user ? (
        <div className="flex items-center gap-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Avatar className="size-6 rounded-none cursor-pointer">
                <AvatarImage src={user?.image || ""} className="rounded-none" />
                <AvatarFallback className="text-xs bg-[#878787]">
                  {user?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-32"
              side="bottom"
              sideOffset={8}
            >
              <DropdownMenuItem asChild>
                <button
                  type="button"
                  onClick={() =>
                    setQueryStates({ addCompany: true, redirect: true })
                  }
                  className="w-full text-left"
                >
                  Add Company
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/jobs/new">Post a job</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/alerts">Alerts</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <GithubSignin />
      )}
    </motion.div>
  );
}
