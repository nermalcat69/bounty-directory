"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

const navigationItems = [
  { href: "/", label: "Bounties" },
];

export function Menu() {
  return (
    <aside className="w-64 p-4 flex flex-col">
      <ScrollArea className="flex-grow">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <Link href={item.href} key={item.label}>
              <Button variant="ghost" className="w-full justify-start">
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <Separator className="my-4" />
      <a
        href="https://github.com/pontusab/bounty.directory"
        target="_blank"
        rel="noreferrer"
      >
        <Button
          className="w-full bg-[#F5F5F3]/30 text-black border border-black rounded-full items-center justify-center gap-2 font-medium hidden md:flex dark:text-white dark:border-white"
          variant="outline"
        >
          <span>Submit</span> <PlusIcon className="w-4 h-4" />
        </Button>
      </a>
    </aside>
  );
}
