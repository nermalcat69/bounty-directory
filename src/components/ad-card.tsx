"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Ad } from "@/data/ads";
import { useOpenPanel } from "@openpanel/nextjs";
import Image from "next/image";
import { useEffect } from "react";

export function AdCard({ ad }: { ad: Ad }) {
  const op = useOpenPanel();

  useEffect(() => {
    op.track("ad_grid_viewed", {
      ad_id: ad.id,
      ad_url: ad.link,
      type: "ad_card",
    });
  }, [ad]);

  return (
    <Card className="bg-background p-4 max-h-[calc(100vh-8rem)] aspect-square flex flex-col">
      <CardContent className="bg-card h-full mb-2 p-0 font-mono text-sm group relative flex-grow">
        <a
          href={ad.link}
          onClick={() => {
            op.track("ad_card_clicked", {
              ad_id: ad.id,
              ad_url: ad.link,
              type: "ad_card",
            });
          }}
          target="_blank"
          rel="noopener noreferrer"
          className="h-full"
        >
          <div className="h-full relative">
            {ad.imageUrl ? (
              <Image
                src={ad.imageUrl}
                alt={`${ad.title} preview`}
                fill
                className="object-cover"
                quality={100}
              />
            ) : (
              <div className="h-full w-full bg-neutral-900 border-2 border-dashed border-neutral-700 flex items-center justify-center">
                <div className="text-center text-neutral-500">
                  <div className="text-2xl mb-2">📸</div>
                  <div className="text-xs font-mono">Ad Cover</div>
                  <div className="text-xs font-mono opacity-60">Empty Slot</div>
                </div>
              </div>
            )}
          </div>
        </a>
      </CardContent>

      <CardHeader className="p-0 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm truncate">{ad.title}</CardTitle>
          <div className="relative w-6 h-6">
            {ad.logoUrl ? (
              <Image
                quality={100}
                src={ad.logoUrl}
                alt={`${ad.title} logo`}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-6 h-6 bg-neutral-800 border border-dashed border-neutral-600 rounded flex items-center justify-center">
                <div className="text-xs text-neutral-500">🏢</div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#878787] font-mono">{ad.description}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
