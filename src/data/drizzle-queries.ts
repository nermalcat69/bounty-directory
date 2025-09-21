import { db } from "@/db";
import { 
  users, 
  posts, 
  companies, 
  jobs, 
  freelance,
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

// Freelance queries
export async function getFeaturedFreelance() {
  return await db
    .select({
      id: freelance.id,
      title: freelance.title,
      description: freelance.description,
      projectType: freelance.projectType,
      budgetRange: freelance.budgetRange,
      duration: freelance.duration,
      skills: freelance.skills,
      urgency: freelance.urgency,
      contactEmail: freelance.contactEmail,
      plan: freelance.plan,
      createdAt: freelance.createdAt,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        image: companies.image,
      },
    })
    .from(freelance)
    .innerJoin(companies, eq(freelance.companyId, companies.id))
    .where(and(eq(freelance.active, true), eq(freelance.plan, "featured")))
    .orderBy(asc(freelance.order), desc(freelance.createdAt))
    .limit(10);
}

export async function getFreelance() {
  return await db
    .select({
      id: freelance.id,
      title: freelance.title,
      description: freelance.description,
      projectType: freelance.projectType,
      budgetRange: freelance.budgetRange,
      duration: freelance.duration,
      skills: freelance.skills,
      urgency: freelance.urgency,
      contactEmail: freelance.contactEmail,
      workplace: freelance.workplace,
      ownerId: freelance.ownerId,
      plan: freelance.plan,
      createdAt: freelance.createdAt,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        image: companies.image,
      },
    })
    .from(freelance)
    .innerJoin(companies, eq(freelance.companyId, companies.id))
    .where(eq(freelance.active, true))
    .orderBy(sql`RANDOM()`)
    .limit(20);
}

export async function getFreelanceByCompany(companyId: string) {
  return await db
    .select()
    .from(freelance)
    .where(and(eq(freelance.companyId, companyId), eq(freelance.active, true)))
    .orderBy(desc(freelance.createdAt));
}

export async function getFreelanceById(freelanceId: string) {
  const result = await db
    .select({
      id: freelance.id,
      title: freelance.title,
      description: freelance.description,
      projectType: freelance.projectType,
      budgetRange: freelance.budgetRange,
      duration: freelance.duration,
      skills: freelance.skills,
      urgency: freelance.urgency,
      contactEmail: freelance.contactEmail,
      plan: freelance.plan,
      createdAt: freelance.createdAt,
      ownerId: freelance.ownerId,
      workplace: freelance.workplace,
      companyId: freelance.companyId,
      active: freelance.active,
      company: {
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        description: companies.description,
        website: companies.website,
        image: companies.image,
      },
    })
    .from(freelance)
    .innerJoin(companies, eq(freelance.companyId, companies.id))
    .where(eq(freelance.id, freelanceId))
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