import { Button } from "@/components/ui/button";
import { ExternalLink, Github, DollarSign, Users, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function HowToGetListedPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">How to Get Listed</h1>
          <p className="text-xl text-[#878787] max-w-2xl mx-auto">
            Learn how to get your bounties featured on bounty.directory and connect with talented developers
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-6 border border-border rounded-lg">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold mb-1">Active Bounties</h3>
            <p className="text-[#878787] text-sm">Hundreds of open bounties</p>
          </div>
          <div className="text-center p-6 border border-border rounded-lg">
            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold mb-1">Developer Community</h3>
            <p className="text-[#878787] text-sm">Thousands of skilled developers</p>
          </div>
          <div className="text-center p-6 border border-border rounded-lg">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold mb-1">Success Rate</h3>
            <p className="text-[#878787] text-sm">High completion rate</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Step 1 */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Create GitHub Issues with Bounty Labels
            </h2>
            <div className="bg-muted/30 p-6 rounded-lg mb-4">
              <p className="text-[#878787] leading-relaxed mb-4">
                To get your bounties automatically listed on bounty.directory, you need to create GitHub issues in your repository with the special bounty label.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Add the bounty label</p>
                    <p className="text-sm text-[#878787]">Use the label <code className="bg-muted px-2 py-1 rounded text-xs">💎 Bounty</code> on your GitHub issues</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Specify the bounty amount</p>
                    <p className="text-sm text-[#878787]">Include a label like <code className="bg-muted px-2 py-1 rounded text-xs">$100</code>, <code className="bg-muted px-2 py-1 rounded text-xs">$500</code>, etc.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Write clear descriptions</p>
                    <p className="text-sm text-[#878787]">Provide detailed requirements, acceptance criteria, and any relevant context</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Pro tip:</strong> Our system automatically scans GitHub for issues with the "💎 Bounty" label and updates the directory regularly.
              </p>
            </div>
          </section>

          {/* Step 2 */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Best Practices for Bounty Issues
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-green-600">✅ Do</h3>
                <ul className="space-y-2 text-sm text-[#878787]">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    Use clear, descriptive titles
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    Provide detailed acceptance criteria
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    Include relevant code examples or mockups
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    Set realistic bounty amounts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    Respond promptly to questions
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    Close issues when completed
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-red-600">❌ Don't</h3>
                <ul className="space-y-2 text-sm text-[#878787]">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Use vague or unclear descriptions
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Set unrealistic deadlines
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Change requirements after work starts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Ignore contributor questions
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Forget to pay completed bounties
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Leave stale issues open
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              Example Bounty Issue
            </h2>
            <div className="bg-muted/30 p-6 rounded-lg border-l-4 border-primary">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Title:</h3>
                  <p className="bg-muted p-3 rounded text-sm font-mono">
                    Add dark mode toggle to user settings page
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Labels:</h3>
                  <div className="flex gap-2">
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-xs">💎 Bounty</span>
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs">$150</span>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">frontend</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Description:</h3>
                  <div className="bg-muted p-3 rounded text-sm space-y-2">
                    <p><strong>Objective:</strong> Implement a dark mode toggle in the user settings page</p>
                    <p><strong>Requirements:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Add toggle switch component to settings page</li>
                      <li>Persist user preference in localStorage</li>
                      <li>Apply dark theme across all pages</li>
                      <li>Ensure accessibility compliance</li>
                    </ul>
                    <p><strong>Acceptance Criteria:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Toggle works on all pages</li>
                      <li>Theme persists after page refresh</li>
                      <li>Smooth transition animations</li>
                      <li>All text remains readable in both modes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Step 4 */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Payment & Recognition
            </h2>
            <div className="bg-muted/30 p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Payment Methods</h3>
                  <ul className="space-y-2 text-sm text-[#878787]">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      GitHub Sponsors
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      PayPal
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Cryptocurrency
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Bank transfer
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Other digital payment platforms
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Recognition</h3>
                  <ul className="space-y-2 text-sm text-[#878787]">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Contributor credit in README
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Social media shoutouts
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Portfolio project references
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Future collaboration opportunities
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-muted/30 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Ready to Get Started?</h2>
            <p className="text-[#878787] mb-6 max-w-2xl mx-auto">
              Create your first bounty issue on GitHub and watch talented developers contribute to your project.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <a 
                  href="https://github.com/search?q=label%3A%22💎+Bounty%22&type=issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  View Example Bounties
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/rules">
                  Browse All Bounties
                </Link>
              </Button>
            </div>
          </section>

          {/* FAQ Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">How long does it take for my bounty to appear?</h3>
                <p className="text-[#878787] text-sm">
                  Our system scans GitHub regularly for new bounty issues. Your bounty should appear within a few hours of creating the issue with the proper labels.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Can I modify the bounty amount after posting?</h3>
                <p className="text-[#878787] text-sm">
                  Yes, you can update the bounty amount by editing the labels on your GitHub issue. The changes will be reflected in our directory during the next update cycle.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What if no one claims my bounty?</h3>
                <p className="text-[#878787] text-sm">
                  Consider reviewing your bounty description for clarity, adjusting the amount, or promoting it in developer communities. You can also reach out to us for advice on improving your bounty's visibility.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Is there a fee for listing bounties?</h3>
                <p className="text-[#878787] text-sm">
                  No, listing your bounties on bounty.directory is completely free. We believe in supporting the open source community and connecting developers with meaningful work.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}