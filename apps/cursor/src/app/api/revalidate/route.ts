import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

/**
 * API endpoint for on-demand revalidation of ISR pages
 * This can be called when bounty data is updated to immediately refresh cached pages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, tags, paths } = body;

    // Verify the secret to prevent unauthorized revalidation
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json(
        { message: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Revalidate specific tags if provided
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        revalidateTag(tag);
        console.log(`Revalidated tag: ${tag}`);
      }
    }

    // Revalidate specific paths if provided
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        revalidatePath(path);
        console.log(`Revalidated path: ${path}`);
      }
    }

    // Default revalidation for bounty-related pages
    if (!tags && !paths) {
      revalidateTag('bounties');
      revalidateTag('total-bounty-amount');
      revalidateTag('homepage');
      revalidatePath('/');
      revalidatePath('/bounties');
      console.log('Performed default bounty revalidation');
    }

    return NextResponse.json({
      message: 'Revalidation successful',
      timestamp: new Date().toISOString(),
      revalidated: {
        tags: tags || ['bounties', 'total-bounty-amount', 'homepage'],
        paths: paths || ['/', '/bounties']
      }
    });

  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { 
        message: 'Revalidation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check revalidation status
 */
export async function GET() {
  return NextResponse.json({
    message: 'Revalidation endpoint is active',
    usage: {
      method: 'POST',
      body: {
        secret: 'Your REVALIDATION_SECRET',
        tags: ['Optional array of tags to revalidate'],
        paths: ['Optional array of paths to revalidate']
      }
    },
    availableTags: [
      'homepage',
      'bounties',
      'bounty-list',
      'total-bounty-amount'
    ],
    availablePaths: [
      '/',
      '/bounties'
    ]
  });
}