import type { BountyWithAmount } from "@/app/api/bounties/route";
import type { Ad } from "@/data/ads";
import { ads } from "@/data/ads";

export interface BountyOrAd {
  type: 'bounty' | 'ad';
  data: BountyWithAmount | Ad;
  key: string;
}

/**
 * Injects ads at random intervals between bounty cards
 * @param bounties Array of bounties
 * @param adFrequency How often to inject ads (e.g., 5 means every 5th item could be an ad)
 * @param maxAdsPerPage Maximum number of ads to show per page
 * @returns Array of bounties and ads mixed together
 */
export function injectAdsIntoBounties(
  bounties: BountyWithAmount[],
  adFrequency: number = 6,
  maxAdsPerPage: number = 3
): BountyOrAd[] {
  if (bounties.length === 0) return [];
  
  const result: BountyOrAd[] = [];
  let adsInjected = 0;
  
  // Create a more stable seed based on the total number of bounties for consistency
  const seed = bounties.length > 0 ? hashString(`${bounties[0]?.id}-${bounties.length}`) : Date.now();
  const random = createSeededRandom(seed);
  
  for (let i = 0; i < bounties.length; i++) {
    // Add the bounty
    result.push({
      type: 'bounty',
      data: bounties[i],
      key: `bounty-${bounties[i].id}`
    });
    
    // More predictable ad injection - only at exact frequency intervals
    const shouldInjectAd = 
      adsInjected < maxAdsPerPage && 
      i > 0 && 
      (i + 1) % adFrequency === 0; // Remove randomness for more predictable layout
    
    if (shouldInjectAd) {
      const randomAd = getRandomAd(i, random);
      result.push({
        type: 'ad',
        data: randomAd,
        key: `ad-${randomAd.id}-${i}`
      });
      adsInjected++;
    }
  }
  
  return result;
}

/**
 * Gets a random ad from the ads array
 */
function getRandomAd(index: number, randomFn?: () => number): Ad {
  const random = randomFn || Math.random;
  const randomIndex = Math.floor(random() * ads.length);
  return ads[randomIndex];
}

/**
 * Creates a simple hash from a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Creates a seeded random number generator
 */
function createSeededRandom(seed: number): () => number {
  let currentSeed = seed;
  return function() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
}

/**
 * Alternative function for getting random ads (similar to the one used in rule-list)
 */
export function getRandomAdForPosition(position: number, secondaryIndex: number = 0): Ad {
  const combinedIndex = (position + secondaryIndex) % ads.length;
  return ads[combinedIndex];
}