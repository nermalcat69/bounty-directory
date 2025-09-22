import Image from "next/image";

export const metadata = {
  title: "About Bounties Directory",
  description: "Why we built Bounties Directory",
};

export default function About() {
  return (
    <div className="flex flex-col items-center justify-center max-w-screen-md mx-auto px-6 py-12">
      <h1 className="text-4xl mb-12 mt-20 text-center">
        Why We Built <br />
        Bounties Directory
      </h1>

      <div className="space-y-12 mt-10">
        <section>
          <p className="text-[#878787] leading-relaxed text-sm">
            Bounties Directory was born from a simple idea: helping builders,
            hackers, and open source contributors discover opportunities to earn
            while they create. Too many bounty programs, grants, and open source
            incentives are scattered across different platforms making it hard
            for developers to find the right opportunities quickly.{" "}
            <span className="font-medium">Bounties Directory</span> brings them
            all into one place.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-2">Follow Our Journey</h2>
          <p className="text-[#878787] leading-relaxed text-sm">
            Follow{" "}
            <a
              href="https://x.com/arjunaditya_"
              className="text-primary hover:underline"
            >
              @arjunaditya_
            </a>{" "}
            on X to stay updated with the latest bounties, product updates, and
            community highlights.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-2">Acknowledgment</h2>
          <p className="text-[#878787] leading-relaxed text-sm">
            The initial version of Bounties Directory was forked from{" "}
            <a
              href="https://cursor.directory"
              className="text-primary hover:underline"
            >
              cursor.directory
            </a>{" "}
            by{" "}
            <a
              href="https://x.com/pontusab"
              className="text-primary hover:underline"
            >
              @pontusab
            </a>
            . We're grateful to their work.
          </p>
        </section>
      </div>

      <Image
        src="https://bounties.directory/og-image.png"
        alt="Bounties Directory"
        width={1920}
        height={1080}
        className="rounded-lg mb-12 mt-12"
      />
    </div>
  );
}
