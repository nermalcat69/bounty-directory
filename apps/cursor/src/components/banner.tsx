"use client";

import { useOpenPanel } from "@openpanel/nextjs";
import { XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Banner() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const pathname = usePathname();
  const op = useOpenPanel();

  useEffect(() => {
    setCurrentBannerIndex(Math.floor(Math.random() * banners.length));
  }, []);

  const [isAnimating, setIsAnimating] = useState(true); // Start as true
  const [animateDirection, setAnimateDirection] = useState<"up" | "down">("up");

  const banners = [
    {
      id: "buy-ad-spot",
      href: "https://coderabbit.link/cdir",
      logo: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-4 top-5" // Added positioning like other logos
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      ),
      title: "Buy Ad Spot",
      description:
        "Reach out and get seen by 10k+ Developers ↗",
    }
    // {
    //   id: "braingrid",
    //   href: "https://dub.sh/qNdeluS",
    //   logo: (
    //     <img
    //       src="https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-braingrid-logo.svg"
    //       alt="BrainGrid"
    //       className="absolute left-4 top-5"
    //       width={32}
    //       height={32}
    //     />
    //   ),
    //   title: "BrainGrid AI",
    //   description:
    //     "Ship 100x faster with Cursor - AI-Powered Requirements & Task Management for Developers. ↗",
    // },
  ];

  useEffect(() => {
    // Show banner after 2s delay on pathname change
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!isVisible) return;

    // Initial animation up
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);

    const switchBanner = () => {
      setIsAnimating(true);
      setAnimateDirection("down");
      // Animate current banner down
      setTimeout(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
        setAnimateDirection("up");
        // Animate next banner up
        setTimeout(() => {
          setIsAnimating(false);
        }, 300);
      }, 300);
    };

    // Initial switch after 8 seconds
    const timer = setTimeout(switchBanner, 8000);

    // Set up recurring switches every 16 seconds
    const interval = setInterval(switchBanner, 16000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isVisible]);

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsAnimating(true);
    setAnimateDirection("down");
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
    }, 300);
  };

  const slideClass = isAnimating
    ? animateDirection === "down"
      ? "animate-out slide-out-to-bottom duration-300"
      : "animate-in slide-in-from-bottom-full duration-300"
    : "";

  const currentBanner = banners[currentBannerIndex];

  if (!isVisible || !currentBanner) return null;

  // Hide banner on specific pages
  if (
    pathname.includes("/games") ||
    pathname.includes("/board") ||
    pathname.endsWith("/new") ||
    pathname.endsWith("/edit")
  ) {
    return null;
  }

  return (
    <a
      href={currentBanner.href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        op.track("banner_clicked", {
          banner_id: currentBanner.id,
          banner_url: currentBanner.href,
          type: "banner",
        });
      }}
    >
      <div
        className={`fixed overflow-hidden ${slideClass} z-50 bottom-4 md:bottom-4 left-4 md:left-auto right-4 md:right-4 w-[calc(100vw-32px)] md:w-[calc(100vw-16px)] md:max-w-[370px] border border-border p-4 transition-all bg-background h-[88px] group`}
      >
        {currentBanner.logo}

        <div className="flex justify-between">
          <div className="flex flex-col space-y-0.5 pl-[40px]">
            <div className="flex space-x-2 items-center">
              <span className="text-sm font-medium">{currentBanner.title}</span>
            </div>
            <p className="text-xs text-[#878787]">
              {currentBanner.description}
            </p>
          </div>

          <button
            type="button"
            className="absolute right-1.5 top-1.5 text-[#878787] hidden group-hover:block"
            onClick={handleClose}
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </a>
  );
}
