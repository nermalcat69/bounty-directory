export const metadata = {
  title: "How to Attempt Issues - Bounty Directory",
  description: "Learn how to properly attempt bounty issues without asking permission",
};

export default function HowToAttemptIssues() {
  return (
    <div className="flex flex-col items-center justify-center max-w-screen-md mx-auto px-6 py-12">
      <h1 className="text-4xl mb-12 mt-20 text-center">
        How to Attempt Issues
      </h1>

      <div className="space-y-12 mt-10">
        <section>
          <p className="text-[#878787] leading-relaxed text-sm">
            <span className="font-medium">Don't ask "Can I work on this?"</span> Instead, do your research first. 
            Check if anyone else is already working on it, then dive right in! This guide will show you 
            exactly how to properly check if an issue is available and start working on it.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-2">Step 1: Check for Existing Work</h2>
          <p className="text-[#878787] leading-relaxed text-sm">
            Before starting, always check if someone else is already working on the issue:
          </p>
          <ul className="text-[#878787] leading-relaxed text-sm mt-2 ml-4 space-y-1">
            <li>• <span className="font-medium">Pull Requests:</span> Look for open PRs that reference the issue</li>
            <li>• <span className="font-medium">Recent Comments:</span> Check if someone claimed they're working on it</li>
            <li>• <span className="font-medium">Assignees:</span> See if the issue is assigned to someone</li>
            <li>• <span className="font-medium">Linked Branches:</span> Look for development branches related to the issue</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-2">Step 2: Start Working</h2>
          <p className="text-[#878787] leading-relaxed text-sm">
            If the coast is clear, jump right in:
          </p>
          <ul className="text-[#878787] leading-relaxed text-sm mt-2 ml-4 space-y-1">
            <li>• <span className="font-medium">Fork the repository</span> and create a new branch</li>
            <li>• <span className="font-medium">Comment on the issue</span> that you're working on it (optional but courteous)</li>
            <li>• <span className="font-medium">Start coding</span> and make your changes</li>
            <li>• <span className="font-medium">Submit a PR</span> when ready, referencing the issue</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-2">Step 3: Handle Conflicts</h2>
          <p className="text-[#878787] leading-relaxed text-sm">
            If you discover someone else is working on it:
          </p>
          <ul className="text-[#878787] leading-relaxed text-sm mt-2 ml-4 space-y-1">
            <li>• <span className="font-medium">Check their progress:</span> How recent is their work?</li>
            <li>• <span className="font-medium">Consider collaboration:</span> Reach out to work together</li>
            <li>• <span className="font-medium">Find another issue:</span> There are plenty of bounties available</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-2">Best Practices</h2>
          <p className="text-[#878787] leading-relaxed text-sm">
            <span className="font-medium">Do:</span> Research thoroughly before starting, read the issue description completely, 
            check the repository's contributing guidelines, test your solution thoroughly, write clear commit messages, 
            and include tests if applicable.
          </p>
          <p className="text-[#878787] leading-relaxed text-sm mt-2">
            <span className="font-medium">Don't:</span> Ask "Can I work on this?" without research, start work on assigned issues, 
            ignore existing pull requests, submit incomplete solutions, ignore the project's code style, 
            or abandon work without notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-2">Red Flags - Don't Start Work If:</h2>
          <ul className="text-[#878787] leading-relaxed text-sm ml-4 space-y-1">
            <li>• There's an open PR addressing the issue (even if it's a draft)</li>
            <li>• Someone commented they're working on it within the last 7 days</li>
            <li>• The issue is assigned to someone</li>
            <li>• There are active development branches referencing the issue</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-2">Still Have Questions?</h2>
          <p className="text-[#878787] leading-relaxed text-sm">
            Join our{" "}
            <a
              href="https://discord.gg/gpRxmW63JW"
              className="text-primary hover:underline"
            >
              Discord community
            </a>{" "}
            to get help, discuss bounties, and connect with other developers working on open source projects.
          </p>
        </section>
      </div>
    </div>
  );
}
