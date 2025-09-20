import { db } from "@/db";
import { 
  posts, 
  jobs, 
  freelance,
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

// Freelance actions
export async function createFreelance(data: {
  title: string;
  companyId: string;
  description: string;
  workplace: "On site" | "Remote" | "Hybrid";
  projectType: "Web Development" | "Mobile App" | "Desktop App" | "API Development" | "Database Design" | "UI/UX Design" | "DevOps" | "Data Analysis" | "Machine Learning" | "Other";
  budgetRange: "Under $500" | "$500-$1000" | "$1000-$2500" | "$2500-$5000" | "$5000-$10000" | "$10000+";
  duration?: string;
  skills?: string;
  urgency: "Low" | "Medium" | "High" | "Urgent";
  contactEmail: string;
  plan?: "standard" | "featured" | "premium";
  ownerId: string;
}) {
  const result = await db
    .insert(freelance)
    .values({
      title: data.title,
      companyId: data.companyId,
      description: data.description,
      workplace: data.workplace,
      projectType: data.projectType,
      budgetRange: data.budgetRange,
      duration: data.duration,
      skills: data.skills,
      urgency: data.urgency,
      contactEmail: data.contactEmail,
      plan: data.plan || "standard",
      ownerId: data.ownerId,
    })
    .returning();

  return result[0];
}

export async function updateFreelance(
  freelanceId: string, 
  data: Partial<{
    title: string;
    description: string;
    workplace: "On site" | "Remote" | "Hybrid";
    projectType: "Web Development" | "Mobile App" | "Desktop App" | "API Development" | "Database Design" | "UI/UX Design" | "DevOps" | "Data Analysis" | "Machine Learning" | "Other";
    budgetRange: "Under $500" | "$500-$1000" | "$1000-$2500" | "$2500-$5000" | "$5000-$10000" | "$10000+";
    duration: string;
    skills: string;
    urgency: "Low" | "Medium" | "High" | "Urgent";
    contactEmail: string;
    active: boolean;
  }>
) {
  const result = await db
    .update(freelance)
    .set(data)
    .where(eq(freelance.id, freelanceId))
    .returning();

  return result[0];
}

export async function deleteFreelance(freelanceId: string) {
  const result = await db
    .delete(freelance)
    .where(eq(freelance.id, freelanceId))
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