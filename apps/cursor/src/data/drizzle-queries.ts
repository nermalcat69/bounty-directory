import { db } from "@/db";
import { 
  users, 
  posts, 
  companies, 
  jobs, 
  mcps, 
  votes,
  avatars 
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
      hero: users.hero,
      status: users.status,
      bio: users.bio,
      work: users.work,
      website: users.website,
      slug: users.slug,
      socialXLink: users.socialXLink,
      createdAt: users.createdAt,
      public: users.public,
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
        slug: users.slug,
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

// Job queries
export async function getFeaturedJobs() {
  return await db
    .select({
      id: jobs.id,
      title: jobs.title,
      location: jobs.location,
      description: jobs.description,
      link: jobs.link,
      workplace: jobs.workplace,
      experience: jobs.experience,
      plan: jobs.plan,
      createdAt: jobs.createdAt,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        image: companies.image,
      },
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(eq(jobs.active, true), eq(jobs.plan, "featured")))
    .orderBy(asc(jobs.order), desc(jobs.createdAt))
    .limit(10);
}

export async function getJobs() {
  return await db
    .select({
      id: jobs.id,
      title: jobs.title,
      location: jobs.location,
      description: jobs.description,
      link: jobs.link,
      workplace: jobs.workplace,
      experience: jobs.experience,
      plan: jobs.plan,
      createdAt: jobs.createdAt,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        image: companies.image,
      },
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.active, true))
    .orderBy(sql`RANDOM()`)
    .limit(20);
}

export async function getJobsByCompany(companyId: string) {
  return await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.companyId, companyId), eq(jobs.active, true)))
    .orderBy(desc(jobs.createdAt));
}

export async function getJobById(jobId: string) {
  const result = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      location: jobs.location,
      description: jobs.description,
      link: jobs.link,
      workplace: jobs.workplace,
      experience: jobs.experience,
      plan: jobs.plan,
      createdAt: jobs.createdAt,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        description: companies.description,
        website: companies.website,
        image: companies.image,
      },
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.id, jobId))
    .limit(1);

  return result[0] || null;
}

// MCP queries
export async function getFeaturedMCPs() {
  return await db
    .select({
      id: mcps.id,
      name: mcps.name,
      slug: mcps.slug,
      description: mcps.description,
      repository: mcps.repository,
      npmPackage: mcps.npmPackage,
      plan: mcps.plan,
      createdAt: mcps.createdAt,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        image: companies.image,
      },
    })
    .from(mcps)
    .leftJoin(companies, eq(mcps.companyId, companies.id))
    .where(and(eq(mcps.active, true), eq(mcps.plan, "featured")))
    .orderBy(asc(mcps.order), desc(mcps.createdAt))
    .limit(10);
}

export async function getMCPs() {
  return await db
    .select({
      id: mcps.id,
      name: mcps.name,
      slug: mcps.slug,
      description: mcps.description,
      repository: mcps.repository,
      npmPackage: mcps.npmPackage,
      plan: mcps.plan,
      createdAt: mcps.createdAt,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        image: companies.image,
      },
    })
    .from(mcps)
    .leftJoin(companies, eq(mcps.companyId, companies.id))
    .where(eq(mcps.active, true))
    .orderBy(sql`RANDOM()`)
    .limit(20);
}

export async function getMCPBySlug(slug: string) {
  const result = await db
    .select({
      id: mcps.id,
      name: mcps.name,
      slug: mcps.slug,
      description: mcps.description,
      repository: mcps.repository,
      npmPackage: mcps.npmPackage,
      plan: mcps.plan,
      createdAt: mcps.createdAt,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        description: companies.description,
        website: companies.website,
        image: companies.image,
      },
    })
    .from(mcps)
    .leftJoin(companies, eq(mcps.companyId, companies.id))
    .where(eq(mcps.slug, slug))
    .limit(1);

  return result[0] || null;
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

// Avatar queries
export async function getAvatars() {
  return await db
    .select()
    .from(avatars)
    .orderBy(desc(avatars.createdAt));
}