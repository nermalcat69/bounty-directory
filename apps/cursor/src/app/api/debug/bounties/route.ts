import { NextResponse } from "next/server";
import { redis } from "@/lib/kv";
import { parseBountyAmount } from "@/utils/bounty-calculator";

export async function GET() {
  try {
    // Check what's in Redis
    const snapshot = await redis.get("snapshots:latest");
    const top100 = await redis.get("snapshots:top100");
    
    let bountyData = null;
    let bountyCount = 0;
    let sampleBounties = [];
    let labelAnalysis = [];

    if (snapshot) {
      bountyData = JSON.parse(snapshot);
      bountyCount = bountyData.length;
      
      // Get first 5 bounties for analysis
      sampleBounties = bountyData.slice(0, 5).map((bounty: any) => ({
        title: bounty.title,
        labels: JSON.parse(bounty.labels),
        repo: bounty.repo,
        html_url: bounty.html_url
      }));

      // Analyze labels for bounty amounts
      labelAnalysis = bountyData.slice(0, 10).map((bounty: any) => {
        const labels = JSON.parse(bounty.labels) as string[];
        const bountyLabels = labels.filter(label => 
          label.toLowerCase().includes('bounty') || 
          label.includes('$') || 
          /\d+/.test(label)
        );
        
        return {
          title: bounty.title,
          allLabels: labels,
          bountyLabels,
          repo: bounty.repo
        };
      });
    }

    // Test our unified API
    const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/bounties?mode=total`);
    const totalBountyResult = apiResponse.ok ? await apiResponse.json() : null;

    // Test individual parsing
    const testAmounts = ['$100', '$2k', '$1.5m', '$500', '100', '2k'];
    const parsedAmounts = testAmounts.map(amount => ({
      input: amount,
      parsed: parseBountyAmount(amount)
    }));

    return NextResponse.json({
      redis_status: {
        has_latest_snapshot: !!snapshot,
        has_top100_snapshot: !!top100,
        bounty_count: bountyCount
      },
      sample_bounties: sampleBounties,
      label_analysis: labelAnalysis,
      total_bounty_calculation: totalBountyResult,
      test_parsing: parsedAmounts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}