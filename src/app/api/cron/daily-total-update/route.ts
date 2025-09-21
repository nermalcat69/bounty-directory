import { NextResponse } from "next/server";
import { redisCache } from "@/lib/redis-cache";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { revalidatePath, revalidateTag } from "next/cache";

export async function GET() {
  try {
    console.log("📊 Starting daily total update...");
    
    // Get existing bounty data from PostgreSQL cache
    const snapshotsData = await redisCache.get("snapshots:latest");
  if (!snapshotsData) {
    console.log("❌ No bounty data found in cache. Run daily bounty update first.");
      return NextResponse.json(
        { success: false, error: "No bounty data found. Run daily bounty update first." },
        { status: 404 }
      );
    }
    
    const bounties = JSON.parse(snapshotsData);
    console.log(`📈 Processing ${bounties.length} bounties for total calculation...`);
    
    // Calculate overall totals
    let totalAmount = 0;
    let validBountiesCount = 0;
    const languageTotals: Record<string, { amount: number; count: number }> = {};
    const repoTotals: Record<string, { amount: number; count: number }> = {};
    
    for (const bounty of bounties) {
      // Extract amount from either the amount field or labels
      let bountyAmountString = bounty.amount;
      
      // If no amount field, try to extract from labels
      if (!bountyAmountString && bounty.labels) {
        try {
          let labels = [];
          
          // Handle different label formats (string or array)
          if (typeof bounty.labels === 'string') {
            labels = JSON.parse(bounty.labels);
          } else if (Array.isArray(bounty.labels)) {
            labels = bounty.labels;
          }
          
          // Extract amount from labels
          for (const label of labels) {
            const labelName = typeof label === 'string' ? label : label?.name;
            if (labelName && (labelName.includes('$') || labelName.toLowerCase().includes('bounty'))) {
              // Use regex to extract dollar amounts
              const match = labelName.match(/\$(\d+(?:\.\d+)?[km]?)/i);
              if (match) {
                bountyAmountString = `$${match[1]}`;
                break;
              }
            }
          }
        } catch (error) {
          console.error('Error parsing labels for bounty:', bounty.id, error);
        }
      }
      
      if (bountyAmountString) {
        const amount = parseBountyAmount(bountyAmountString);
        if (amount > 0) {
          totalAmount += amount;
          validBountiesCount++;
          
          // Track by language
          const language = bounty.language || "Unknown";
          if (!languageTotals[language]) {
            languageTotals[language] = { amount: 0, count: 0 };
          }
          languageTotals[language].amount += amount;
          languageTotals[language].count++;
          
          // Track by repository
          const repo = bounty.repo || "Unknown";
          if (!repoTotals[repo]) {
            repoTotals[repo] = { amount: 0, count: 0 };
          }
          repoTotals[repo].amount += amount;
          repoTotals[repo].count++;
        }
      }
    }
    
    const formattedTotal = formatBountyAmount(totalAmount);
    const timestamp = new Date().toISOString();
    
    // Cache overall total
    const totalData = {
      amount: totalAmount,
      formatted: formattedTotal,
      lastUpdated: timestamp,
      count: bounties.length,
      validBounties: validBountiesCount
    };
    await redisCache.setex("bounty:total", 86400, JSON.stringify(totalData));
    
    // Cache language-specific totals
    const languageKeys: string[] = [];
    for (const [language, data] of Object.entries(languageTotals)) {
      const languageKey = `bounty:total:language:${language.toLowerCase()}`;
      const languageData = {
        language,
        amount: data.amount,
        formatted: formatBountyAmount(data.amount),
        count: data.count,
        lastUpdated: timestamp
      };
      await redisCache.setex(languageKey, 86400, JSON.stringify(languageData));
      languageKeys.push(languageKey);
    }
    
    // Cache repository-specific totals (top 50 repos only)
    const topRepos = Object.entries(repoTotals)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 50);
    
    const repoKeys: string[] = [];
    for (const [repo, data] of topRepos) {
      const repoKey = `bounty:total:repo:${repo.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      const repoData = {
        repo,
        amount: data.amount,
        formatted: formatBountyAmount(data.amount),
        count: data.count,
        lastUpdated: timestamp
      };
      await redisCache.setex(repoKey, 86400, JSON.stringify(repoData));
      repoKeys.push(repoKey);
    }
    
    // Cache list of available languages and repos
    await redisCache.setex("bounty:languages", 86400, JSON.stringify(Object.keys(languageTotals)));
    await redisCache.setex("bounty:repositories", 86400, JSON.stringify(topRepos.map(([repo]) => repo)));
    
    // Cache summary statistics
    const summaryStats = {
      totalAmount,
      formattedTotal,
      totalBounties: bounties.length,
      validBounties: validBountiesCount,
      languageCount: Object.keys(languageTotals).length,
      repositoryCount: Object.keys(repoTotals).length,
      topLanguages: Object.entries(languageTotals)
        .sort(([, a], [, b]) => b.amount - a.amount)
        .slice(0, 10)
        .map(([language, data]) => ({
          language,
          amount: data.amount,
          formatted: formatBountyAmount(data.amount),
          count: data.count
        })),
      topRepositories: topRepos.slice(0, 10).map(([repo, data]) => ({
        repo,
        amount: data.amount,
        formatted: formatBountyAmount(data.amount),
        count: data.count
      })),
      lastUpdated: timestamp
    };
    await redisCache.setex("bounty:summary", 86400, JSON.stringify(summaryStats));
    
    // Revalidate ISR cache
    revalidateTag("bounties");
    revalidateTag("bounty-totals");
    revalidateTag("bounty-stats");
    revalidatePath("/");
    revalidatePath("/bounties");
    revalidatePath("/stats");
    
    console.log(`✅ Daily total update complete: ${formattedTotal} across ${validBountiesCount} valid bounties`);
    console.log(`📊 Languages: ${Object.keys(languageTotals).length}, Repositories: ${Object.keys(repoTotals).length}`);
    
    return NextResponse.json({
      success: true,
      message: "Daily total update completed successfully",
      result: {
        totalAmount,
        formattedTotal,
        totalBounties: bounties.length,
        validBounties: validBountiesCount,
        languageCount: Object.keys(languageTotals).length,
        repositoryCount: Object.keys(repoTotals).length,
        cachedKeys: {
          languages: languageKeys.length,
          repositories: repoKeys.length
        },
        lastUpdated: timestamp
      }
    });
    
  } catch (error) {
    console.error("Daily total update error:", error);
    return NextResponse.json(
      { success: false, error: "Daily total update failed" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}