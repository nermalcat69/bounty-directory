"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CommandEmpty, CommandInput } from "./ui/command";
import { CommandDialog, CommandItem, CommandList } from "./ui/command";

const navigationItems = [
  { title: "Bounties", href: "/" },
  { title: "About", href: "/about" },
];

export function CommandMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search navigation..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {navigationItems.map((item) => (
          <CommandItem
            key={item.title}
            onSelect={() => {
              router.push(item.href);
              setOpen(false);
            }}
          >
            {item.title}
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
