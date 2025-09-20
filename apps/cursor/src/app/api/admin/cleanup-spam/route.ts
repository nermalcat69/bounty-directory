import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { issues } from "@/db/schema";
import { inArray } from "drizzle-orm";

// List of spam usernames to clean up
const SPAM_USERNAMES = [
  "19224421664",
  "192600", 
  "gerderanvogdsde5587",
  "kolotikwoan",
  "ylc8037",
  "18605041367"
];

export async function POST(request: NextRequest) {
  try {
    // Delete all issues created by spam users
    const deletedIssues = await db
      .delete(issues)
      .where(inArray(issues.user_login, SPAM_USERNAMES))
      .returning({ id: issues.id, user_login: issues.user_login });

    console.log(`Cleaned up ${deletedIssues.length} spam issues`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully removed ${deletedIssues.length} spam issues`,
      deletedIssues: deletedIssues.map(issue => ({
        id: issue.id,
        user: issue.user_login
      }))
    });

  } catch (error) {
    console.error("Error cleaning up spam issues:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to clean up spam issues" 
      },
      { status: 500 }
    );
  }
}