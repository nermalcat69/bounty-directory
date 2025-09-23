import { db } from "@/db";
import { 
  posts, 
  companies, 
  users, 
  votes
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

// Follow functionality removed - followUser and unfollowUser functions deleted

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