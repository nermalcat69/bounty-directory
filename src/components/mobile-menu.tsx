"use client";

import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

const navigationLinks = [
  { href: "/freelance", label: "Freelance" },
  { href: "/jobs", label: "Jobs" },
  { href: "/faqs", label: "FAQs" },
  { href: "/advertise", label: "Advertise" },
  { href: "/our-analytics", label: "Our Analytics" },
  { href: "/about", label: "About" },
] as const;

export function MobileMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, isPending: isLoading } = useSession();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <>
      <div className="md:hidden mr-4">
        {session?.user ? (
          <Avatar
            className="size-6 rounded-none cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <AvatarImage src={session.user.image || undefined} className="rounded-none" />
            <AvatarFallback className="text-xs bg-[#878787]">
              {session.user.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Button
            variant="ghost"
            className="p-0 w-8 h-8"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[99999] bg-background w-screen h-screen top-[50px] bottom-0 p-4"
          >
            <div className="flex flex-col">
              {navigationLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: navigationLinks.length * 0.02 + index * 0.02,
                    duration: 0.1,
                  }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "block py-5 text-sm font-medium",
                      pathname === link.href
                        ? "text-primary"
                        : "text-[#878787]",
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-12"
                transition={{
                  delay: navigationLinks.length * 0.02 + 0.05,
                  duration: 0.1,
                }}
              >
                {session?.user ? (
                  <>
                    <Button
                      variant="outline"
                      className="bg-white text-black h-8 rounded-full w-full"
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    <Button
                      variant="outline"
                      className="bg-white text-black h-8 rounded-full w-full"
                    >
                      Sign In
                    </Button>
                  </Link>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
