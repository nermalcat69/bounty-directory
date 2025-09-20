import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { canCreateAlerts } from "@/lib/subscription";

// Validation schemas
const createAlertSchema = z.object({
  repo: z.string().optional(),
  query: z.string().optional(),
  delivery_method: z.enum(["discord", "webhook", "email"]),
  destination: z.string().min(1, "Destination is required"),
});

const updateAlertSchema = z.object({
  id: z.string().uuid(),
  repo: z.string().optional(),
  query: z.string().optional(),
  delivery_method: z.enum(["discord", "webhook", "email"]).optional(),
  destination: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

// GET /api/alerts - Fetch user alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.user_id, session.user.id))
      .orderBy(alerts.created_at);

    return NextResponse.json({ alerts: userAlerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create new alert
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can create alerts (subscription check)
    const canCreate = await canCreateAlerts(session.user.id);
    if (!canCreate) {
      return NextResponse.json(
        { error: "You need an active subscription to create alerts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createAlertSchema.parse(body);

    // Check for duplicate alerts
    const conditions = [
      eq(alerts.user_id, session.user.id),
      eq(alerts.delivery_method, validatedData.delivery_method),
      eq(alerts.destination, validatedData.destination)
    ];

    if (validatedData.repo) {
      conditions.push(eq(alerts.repo, validatedData.repo));
    } else {
      conditions.push(isNull(alerts.repo));
    }

    if (validatedData.query) {
      conditions.push(eq(alerts.query, validatedData.query));
    } else {
      conditions.push(isNull(alerts.query));
    }

    const existingAlert = await db
      .select()
      .from(alerts)
      .where(and(...conditions))
      .limit(1);

    if (existingAlert.length > 0) {
      return NextResponse.json(
        { error: "Alert with these settings already exists" },
        { status: 409 }
      );
    }

    const [newAlert] = await db
      .insert(alerts)
      .values({
        user_id: session.user.id,
        repo: validatedData.repo || null,
        query: validatedData.query || null,
        delivery_method: validatedData.delivery_method,
        destination: validatedData.destination,
        active: true,
      })
      .returning();

    return NextResponse.json({ alert: newAlert }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}

// PATCH /api/alerts - Update alert
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateAlertSchema.parse(body);

    // Verify alert belongs to user
    const existingAlert = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.id, validatedData.id),
          eq(alerts.user_id, session.user.id)
        )
      )
      .limit(1);

    if (existingAlert.length === 0) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (validatedData.repo !== undefined) updateData.repo = validatedData.repo;
    if (validatedData.query !== undefined) updateData.query = validatedData.query;
    if (validatedData.delivery_method !== undefined) updateData.delivery_method = validatedData.delivery_method;
    if (validatedData.destination !== undefined) updateData.destination = validatedData.destination;
    if (validatedData.active !== undefined) updateData.active = validatedData.active;

    const [updatedAlert] = await db
      .update(alerts)
      .set(updateData)
      .where(eq(alerts.id, validatedData.id))
      .returning();

    return NextResponse.json({ alert: updatedAlert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

// DELETE /api/alerts - Delete alert
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("id");

    if (!alertId) {
      return NextResponse.json(
        { error: "Alert ID is required" },
        { status: 400 }
      );
    }

    // Verify alert belongs to user
    const existingAlert = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.id, alertId),
          eq(alerts.user_id, session.user.id)
        )
      )
      .limit(1);

    if (existingAlert.length === 0) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    await db.delete(alerts).where(eq(alerts.id, alertId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}