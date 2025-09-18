import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import * as authSchema from "../../auth-schema";

// Helper function to handle social profile mapping with upsert logic
async function handleSocialProfileMapping(profile: any, provider: "github" | "google") {
  console.log(`${provider} profile received:`, JSON.stringify(profile, null, 2));
  
  // Clean and sanitize string values to prevent SQL parameter corruption
  const cleanString = (value: any): string | null => {
    if (!value) return null;
    return String(value).trim().replace(/[`'"]/g, '');
  };
  
  // Extract profile data based on provider
  const email = cleanString(profile.email);
  const name = cleanString(
    provider === "github" 
      ? (profile.name || profile.login)
      : profile.name
  );
  const image = cleanString(
    provider === "github" 
      ? profile.avatar_url 
      : profile.picture
  );
  
  // Check if user already exists by email to prevent duplicates
  if (email) {
    try {
      const existingUser = await db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`User already exists with email: ${email} (${provider} login)`);
        
        // Update existing user with latest profile data
        try {
          const [updatedUser] = await db
            .update(authSchema.user)
            .set({
              name: name || existingUser[0].name,
              image: image || existingUser[0].image,
              updatedAt: new Date(),
            })
            .where(eq(authSchema.user.id, existingUser[0].id))
            .returning();
          
          console.log("Updated existing user:", updatedUser);
          return {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            image: updatedUser.image,
          };
        } catch (updateError) {
          console.error(`Error updating existing user during ${provider} login:`, updateError);
          // Return existing user data if update fails
          return {
            id: existingUser[0].id,
            name: existingUser[0].name,
            email: existingUser[0].email,
            image: existingUser[0].image,
          };
        }
      }
    } catch (error) {
      console.error(`Error checking existing user during ${provider} login:`, error);
      
      // Log detailed error information for PostgreSQL constraint violations
      if (error instanceof Error) {
        if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
          console.error(`PostgreSQL unique constraint violation during ${provider} login:`, {
            provider,
            email,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }
  
  const userData = {
    id: String(profile.id || profile.sub || ""),
    name: name || undefined,
    email: email || undefined,
    image: image || undefined,
  };
  
  console.log(`Mapped new user data for ${provider}:`, JSON.stringify(userData, null, 2));
  return userData;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authSchema.user,
      session: authSchema.session,
      account: authSchema.account,
      verification: authSchema.verification,
    },
    // Use singular table names for auth schema
    usePlural: false,
  }),

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      mapProfileToUser: async (profile) => {
        return await handleSocialProfileMapping(profile, "github");
      },
    },
  },
  
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET!,

});

// Function to sync auth user to main users table
export async function syncUserToMainTable(authUserId: string) {
  try {
    // Get user from auth table
    const authUser = await db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, authUserId))
      .limit(1);

    if (authUser.length === 0) {
      console.log("Auth user not found:", authUserId);
      return;
    }

    const user = authUser[0];
    console.log("Syncing user to main users table:", user);

    // Check if user already exists in main users table by email
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, user.email))
      .limit(1);

    if (existingUser.length === 0) {
      // Create new user in main users table
      const slug = user.name 
        ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        : `user-${Date.now()}`;

      // Generate a proper UUID for the main users table
      const { randomUUID } = await import('crypto');
      const newUserId = randomUUID();

      await db.insert(schema.users).values({
        id: newUserId,
        name: user.name || "Unknown User",
        email: user.email,
        slug: slug,
        public: true, // Set to true so user appears in members page
        createdAt: new Date(),
        updatedAt: new Date(),
        followerCount: 0,
        followingCount: 0,
      });

      console.log("Created new user in main users table:", { id: newUserId, email: user.email, slug });
      return newUserId;
    } else {
      // Update existing user in main users table
      await db
        .update(schema.users)
        .set({
          name: user.name || existingUser[0].name,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existingUser[0].id));

      console.log("Updated existing user in main users table:", { id: existingUser[0].id, email: user.email });
      return existingUser[0].id;
    }
  } catch (error) {
    console.error("Error syncing user to main users table:", error);
    return null;
  }
}