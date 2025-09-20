import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { createSubscriptionCheckoutSession } from "@/lib/polar";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptionStatus = await getSubscriptionStatus(session.user.id);
    
    return NextResponse.json({
      success: true,
      data: subscriptionStatus,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === "create_checkout") {
      // Create a Polar checkout session for subscription
      const checkoutSession = await createSubscriptionCheckoutSession({
        userId: session.user.id,
        email: session.user.email!,
        customerName: session.user.name || session.user.email!,
      });

      return NextResponse.json({
        success: true,
        data: {
          checkoutUrl: checkoutSession.url,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing subscription request:", error);
    return NextResponse.json(
      { error: "Failed to process subscription request" },
      { status: 500 }
    );
  }
}