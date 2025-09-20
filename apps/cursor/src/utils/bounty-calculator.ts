export interface BountyAmount {
  amount: number;
  formatted: string;
}

/**
 * Parse a bounty amount string (e.g., "$2k", "$1.5m", "$100") into a numeric value
 */
export function parseBountyAmount(bountyString: string | null | undefined): number {
  if (!bountyString || typeof bountyString !== 'string') {
    console.warn('parseBountyAmount received non-string input:', bountyString, typeof bountyString);
    return 0;
  }
  
  try {
    // Remove $ and convert to lowercase
    const cleaned = bountyString.replace('$', '').toLowerCase().trim();
  
  // Handle k (thousands) and m (millions) suffixes
  if (cleaned.includes('k')) {
    const number = parseFloat(cleaned.replace('k', ''));
    return number * 1000;
  }
  
  if (cleaned.includes('m')) {
    const number = parseFloat(cleaned.replace('m', ''));
    return number * 1000000;
  }
  
    // Regular number
    return parseFloat(cleaned) || 0;
  } catch (error) {
    console.error('Error parsing bounty amount:', bountyString, error);
    return 0;
  }
}

/**
 * Format a number as a bounty amount string (e.g., 2000 -> "$2k", 1500000 -> "$1.5m")
 */
export function formatBountyAmount(amount: number): string {
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return `$${millions % 1 === 0 ? millions.toString() : millions.toFixed(1)}m`;
  }
  
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `$${thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(1)}k`;
  }
  
  return `$${amount}`;
}

/**
 * Calculate total bounty amount from an array of bounty issues
 */
export function calculateTotalBountyAmount(bounties: Array<{ bounty_amount?: string }>): BountyAmount {
  const total = bounties.reduce((sum, bounty) => {
    if (bounty.bounty_amount) {
      return sum + parseBountyAmount(bounty.bounty_amount);
    }
    return sum;
  }, 0);
  
  return {
    amount: total,
    formatted: formatBountyAmount(total)
  };
}

/**
 * Fetch all bounties and calculate total amount
 */
export async function getTotalBountyAmount(): Promise<BountyAmount> {
  try {
    // Fetch all bounties without pagination to get the total
    const response = await fetch('/api/bounties?limit=1000', {
      cache: 'no-store' // Ensure we get fresh data
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch bounties');
    }
    
    const data = await response.json();
    const bounties = data.issues || [];
    
    return calculateTotalBountyAmount(bounties);
  } catch (error) {
    console.error('Error calculating total bounty amount:', error);
    return {
      amount: 0,
      formatted: '$0'
    };
  }
}