import { db } from "@/db";
import { 
  posts, 
  jobs, 
  companies, 
  users, 
  followers, 
  votes,
  mcps 
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Post actions
export async function createPost(data: {
  title: string;
  content?: string;
  url?: string;
  userId: string;
}) {
  const result = await db
    .insert(posts)
    .values({
      title: data.title,
      content: data.content,
      url: data.url,
      userId: data.userId,
    })
    .returning();

  return result[0];
}

export async function deletePost(postId: string, userId: string) {
  const result = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
    .returning();

  return result[0];
}

// Job actions
export async function createJob(data: {
  title: string;
  companyId: string;
  location?: string;
  description: string;
  link: string;
  workplace: "On site" | "Remote" | "Hybrid";
  experience?: string;
  plan?: "standard" | "featured" | "premium";
}) {
  const result = await db
    .insert(jobs)
    .values({
      title: data.title,
      companyId: data.companyId,
      location: data.location,
      description: data.description,
      link: data.link,
      workplace: data.workplace,
      experience: data.experience,
      plan: data.plan || "standard",
    })
    .returning();

  return result[0];
}

export async function updateJob(
  jobId: string, 
  data: Partial<{
    title: string;
    location: string;
    description: string;
    link: string;
    workplace: "On site" | "Remote" | "Hybrid";
    experience: string;
    active: boolean;
  }>
) {
  const result = await db
    .update(jobs)
    .set(data)
    .where(eq(jobs.id, jobId))
    .returning();

  return result[0];
}

export async function deleteJob(jobId: string) {
  const result = await db
    .delete(jobs)
    .where(eq(jobs.id, jobId))
    .returning();

  return result[0];
}

// Company actions
export async function createCompany(data: {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  image?: string;
  hero?: string;
  ownerId?: string;
}) {
  const result = await db
    .insert(companies)
    .values(data)
    .returning();

  return result[0];
}

export async function updateCompany(
  companyId: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    website: string;
    image: string;
    hero: string;
  }>
) {
  const result = await db
    .update(companies)
    .set(data)
    .where(eq(companies.id, companyId))
    .returning();

  return result[0];
}

// User actions
export async function updateUser(
  userId: string,
  data: Partial<{
    name: string;
    bio: string;
    work: string;
    website: string;
    slug: string;
    socialXLink: string;
    public: boolean;
    followEmail: boolean;
    status: string;
    hero: string;
  }>
) {
  const result = await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId))
    .returning();

  return result[0];
}

// Follow actions
export async function followUser(followerId: string, followingId: string) {
  // Check if already following
  const existing = await db
    .select()
    .from(followers)
    .where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Already following this user");
  }

  const result = await db
    .insert(followers)
    .values({
      followerId,
      followingId,
    })
    .returning();

  // Update follower counts
  await db
    .update(users)
    .set({
      followerCount: sql`${users.followerCount} + 1`,
    })
    .where(eq(users.id, followingId));

  await db
    .update(users)
    .set({
      followingCount: sql`${users.followingCount} + 1`,
    })
    .where(eq(users.id, followerId));

  return result[0];
}

export async function unfollowUser(followerId: string, followingId: string) {
  const result = await db
    .delete(followers)
    .where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)))
    .returning();

  if (result.length > 0) {
    // Update follower counts
    await db
      .update(users)
      .set({
        followerCount: sql`${users.followerCount} - 1`,
      })
      .where(eq(users.id, followingId));

    await db
      .update(users)
      .set({
        followingCount: sql`${users.followingCount} - 1`,
      })
      .where(eq(users.id, followerId));
  }

  return result[0];
}

// Vote actions
export async function votePost(userId: string, postId: string) {
  // Check if already voted
  const existing = await db
    .select()
    .from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.postId, postId)))
    .limit(1);

  if (existing.length > 0) {
    // Remove vote
    const result = await db
      .delete(votes)
      .where(and(eq(votes.userId, userId), eq(votes.postId, postId)))
      .returning();
    
    return { action: "removed", vote: result[0] };
  } else {
    // Add vote
    const result = await db
      .insert(votes)
      .values({
        userId,
        postId,
      })
      .returning();
    
    return { action: "added", vote: result[0] };
  }
}

// MCP actions
export async function createMCP(data: {
  name: string;
  slug: string;
  description?: string;
  repository?: string;
  npmPackage?: string;
  companyId?: string;
  plan?: "standard" | "featured" | "premium";
}) {
  const result = await db
    .insert(mcps)
    .values({
      ...data,
      plan: data.plan || "standard",
    })
    .returning();

  return result[0];
}

export async function updateMCP(
  mcpId: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    repository: string;
    npmPackage: string;
    active: boolean;
  }>
) {
  const result = await db
    .update(mcps)
    .set(data)
    .where(eq(mcps.id, mcpId))
    .returning();

  return result[0];
}