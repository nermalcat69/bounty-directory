import { Button } from "@/components/ui/button";
import { ExternalLink, Github, DollarSign, Users, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function HowToGetListedPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-24">
        {/* Header */}
        <div className=" mb-5">
          <h1 className="text-4xl font-medium mb-4">How to Get Listed</h1>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          <p className="text-[#878787]">
            Actually, it's pretty simple. You just need to create a new issue on our GitHub repository with the appropriate labels with "💎 Bounty" and "$1000" / "$10k".
          </p>
          {/* FAQ Section */}
          <section>
            <h2 className="text-sm text-neutral-500 italic font-medium mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">How long does it take for my bounty to appear?</h3>
                <p className="text-[#878787] text-sm">
                  Our system scans GitHub regularly for new bounty issues. Your bounty should appear within after 60 minutes of creating the issue with the proper labels like "💎 Bounty" and "$1000" / "$10k".
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Can I modify the bounty amount after posting?</h3>
                <p className="text-[#878787] text-sm">
                  Yes, you can update the bounty amount by editing the labels on your GitHub issue. The changes will be reflected in our directory during the next update cycle.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">What if no one claims my bounty?</h3>
                <p className="text-[#878787] text-sm">
                  Consider reviewing your bounty description for clarity, adjusting the amount, or promoting it in developer communities. You can also reach out to us for advice on improving your bounty's visibility.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Is there a fee for listing bounties?</h3>
                <p className="text-[#878787] text-sm">
                  No, listing your bounties on bounty.directory is completely free. We believe in supporting the open source community. But if you pay for alerts, we will send you a notification whenever a new bounty is posted on github instantly.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}