"use client";

import { useQueryState } from "nuqs";
import { HeroTitle } from "./hero-title";
import { Cursor } from "./ui/cursor";
import Link from "next/link";

interface StartpageClientProps {
  totalUsers: number;
  totalBountyAmount?: string;
}

export function StartpageClient({ 
  totalUsers, 
  totalBountyAmount 
}: StartpageClientProps) {
  const [search] = useQueryState("q", { defaultValue: "" });

  return (
    <>
      {/* Cursor loads immediately */}
      <div className="flex justify-center items-center mb-8">
        <Cursor />
      </div>

      {/* Hero with skeleton loading only for bounty amount */}
      <HeroTitle totalUsers={totalUsers} totalBountyAmount={totalBountyAmount} />

      {/* CTA button loads immediately */}
      <div className=" flex flex-row gap-2 justify-center mb-14">
        <Link className="bg-neutral-800 hover:bg-neutral-900 duration-200 text-white text-md px-4 py-2 rounded-full" href="/">
          Learn How to Attempt Issues
        </Link>
                <Link className="bg-neutral-800 hover:bg-neutral-900 duration-200 text-white text-md px-4 py-2 rounded-full" href="https://discord.gg/gpRxmW63JW">
          Join Discord
        </Link>
      </div>
    </>
  );
}

