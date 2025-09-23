import { db } from "@/db";
import { 
  users, 
  posts, 
  companies, 
  votes
} from "@/db/schema";
import { eq, desc, asc, sql, and, or, ilike, count } from "drizzle-orm";

// User queries
export async function getUserProfile(userId: string) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) return null;

  const user = result[0];

  // Get user's posts
  const userPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      url: posts.url,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt));

  return {
    ...user,
    posts: userPosts,
  };
}

// Follow functionality removed - getUserFollowers and getUserFollowing functions deleted

// Post queries
export async function getPopularPosts() {
  return await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      url: posts.url,
      createdAt: posts.createdAt,
      user: {
        id: users.id,
        name: users.name,
        image: users.image,
      },
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .orderBy(sql`RANDOM()`)
    .limit(10);
}

// Company queries
export async function getCompanyProfile(companyId: string) {
  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  return result[0] || null;
}

export async function getUserCompanies(userId: string) {
  return await db
    .select()
    .from(companies)
    .where(eq(companies.ownerId, userId))
    .orderBy(desc(companies.createdAt));
}

export async function getCompanies() {
  return await db
    .select()
    .from(companies)
    .orderBy(sql`RANDOM()`)
    .limit(20);
}







// Stats queries
export async function getTotalUsers() {
  const result = await db
    .select({ count: count() })
    .from(users);
  
  return result[0]?.count || 0;
}

export async function getNewUsers() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db
    .select({ count: count() })
    .from(users)
    .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`);
  
  return result[0]?.count || 0;
}