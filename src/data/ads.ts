export interface Ad {
  id: string;
  title: string;
  description: string;
  logoUrl?: string;
  link: string;
  imageUrl?: string;
}

export const ads: Ad[] = [
  {
    id: "empty-cover-ad",
    title: "Your Ad Here - Cover",
    description: "This ad slot is available for purchase. Contact us to feature your product or service here.",
    // logoUrl: undefined, // No logo - will show empty placeholder
    link: "/advertise",
    // imageUrl: undefined, // No image - will show empty placeholder
  },
  {
    id: "empty-logo-ad",
    title: "Your Ad Here - Logo",
    description: "This ad slot shows how it looks when only the logo is missing.",
    // logoUrl: undefined, // No logo - will show empty placeholder
    link: "/advertise",
    imageUrl: "/ad-cover.png", // Has image but no logo
  },
  // {
  //   id: "speakeasy",
  //   title: "Build APIs LLMs love",
  //   description:
  //     "The modern API toolchain — generate SDKs, docs, and agent tools from OpenAPI",
  //   logoUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-speakeasy-logo.png",
  //   imageUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-speakeasy.jpg",
  //   link: "https://dub.sh/kSWogBB",
  // },
  // {
  //   id: "sentry",
  //   title: "Sentry.io - Build with AI, debug broken code.",
  //   description:
  //     "Monitor your AI agents with Sentry. bounty.directory users get 3 months free of our team plan here.",
  //   logoUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-sentry-logo-v2.png",
  //   imageUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-sentry.jpg",
  //   link: "https://go.midday.ai/7kRYLa5",
  // },
  // {
  //   id: "runpod",
  //   title: "RunPod",
  //   description: "Train, fine-tune and deploy AI models on demand.",
  //   link: "https://dub.sh/8x2aNff",
  //   logoUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-runpod-logo.jpg",
  //   imageUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-runpod.jpg",
  // },
  // {
  //   id: "coderabbit",
  //   title: "CodeRabbit",
  //   description:
  //     "AI Code Reviews. Spot bugs, 1-click fixes, refactor effortlessly",
  //   logoUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-coderabbit-logo.webp",
  //   link: "https://coderabbit.link/XrK0XJY",
  //   imageUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-coderabbit.jpg",
  // },
  // {
  //   id: "braingrid",
  //   title: "BrainGrid",
  //   description:
  //     "Turn half-baked thoughts into crystal-clear, AI-ready specs and tasks that Cursor can nail, the first time",
  //   logoUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-braingrid-logo.svg",
  //   link: "https://dub.sh/qNdeluS",
  //   imageUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-braingrid.png",
  // },
  // {
  //   id: "byterover",
  //   title: "Byterover",
  //   description: "Shared memory layer for your AI coding agents",
  //   logoUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-byterover-logo.png",
  //   imageUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-byterover.png",
  //   link: "https://go.midday.ai/lFmE25k",
  // },

  // {
  //   id: "korbit",
  //   title: "Korbit AI",
  //   description: "Deliver better code, faster with AI-powered code reviews.",
  //   imageUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-korbit-v2.png",
  //   link: "https://go.midday.ai/ahVXS7J",
  //   logoUrl:
  //     "https://pub-abe1cd4008f5412abb77357f87d7d7bb.r2.dev/ads-korbit-logo.jpg",
  // },
];
