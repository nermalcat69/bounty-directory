import { db } from "@/db";
import { users, posts, votes, companies, jobs } from "@/db/schema";
import { eq, and, desc, count, or, asc, ne, ilike } from "drizzle-orm";

export async function getUserProfile(userId: string) {
  // Find user by ID only
  const userData = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userData.length) {
    return {
      data: null,
    };
  }

  const user = userData[0];

  // Get user posts with votes
  const userPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      createdAt: posts.createdAt,
      userId: posts.userId,
      voteCount: count(votes.id),
    })
    .from(posts)
    .leftJoin(votes, eq(posts.id, votes.postId))
    .where(eq(posts.userId, user.id))
    .groupBy(posts.id)
    .orderBy(desc(posts.createdAt));

  // Follow functionality removed

  return {
    data: {
      ...user,
      created_at: user.createdAt,
      posts: userPosts.map((post) => ({
        ...post,
        user_avatar: user.image,
        user_name: user.name,
        vote_count: post.voteCount,
      })),
    },
  };
}

// Follow functionality removed - getUserFollowers and getUserFollowing functions deleted

export async function getPopularPosts() {
  try {
    // Get posts with vote counts and user info, ordered by vote count descending
    const data = await db
      .select({
        post_id: posts.id,
        title: posts.title,
        content: posts.content,
        url: posts.url,
        created_at: posts.createdAt,
        vote_count: count(votes.id),
        user_name: users.name,
        user_avatar: users.image,

      })
      .from(posts)
      .leftJoin(votes, eq(posts.id, votes.postId))
      .leftJoin(users, eq(posts.userId, users.id))
      .groupBy(posts.id, users.id, users.name, users.image)
      .orderBy(desc(count(votes.id)))
      .limit(50);

    // Transform the data to match the expected format
    const transformedData = data.map(post => {
      // Simple hash function to convert UUID to number
      let hash = 0;
      for (let i = 0; i < post.post_id.length; i++) {
        const char = post.post_id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      return {
        post_id: Math.abs(hash),
        title: post.title,
        content: post.content || "",
        url: post.url || "",
        created_at: post.created_at ? post.created_at.toISOString() : new Date().toISOString(),
        vote_count: Number(post.vote_count),
        user_name: post.user_name || "Unknown",
        user_avatar: post.user_avatar || "",

        slug: post.post_id, // Using post id as slug
        has_voted: false, // This would need to be calculated based on current user
      };
    });

    return { data: transformedData };
  } catch (error) {
    console.error(error);
    return { data: null };
  }
}

export async function getCompanyProfile(slug: string, userId?: string) {
  try {
    const whereConditions = userId 
      ? and(eq(companies.slug, slug), eq(companies.ownerId, userId))
      : eq(companies.slug, slug);

    const data = await db
      .select()
      .from(companies)
      .where(whereConditions)
      .limit(1);

    return { data: data[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getUserCompanies(userId: string) {
  try {
    const data = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, userId));

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getCompanies() {
  try {
    const data = await db
      .select()
      .from(companies)
      .orderBy(desc(companies.createdAt));

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getFeaturedJobs({
  onlyPremium,
}: {
  onlyPremium?: boolean;
} = {}) {
  try {
    const planCondition = onlyPremium 
      ? eq(jobs.plan, "premium")
      : or(eq(jobs.plan, "featured"), eq(jobs.plan, "premium"));

    const data = await db
      .select({
        id: jobs.id,
         title: jobs.title,
         description: jobs.description,
         location: jobs.location,
         link: jobs.link,
         workplace: jobs.workplace,
         experience: jobs.experience,
         plan: jobs.plan,
         order: jobs.order,
         active: jobs.active,
         createdAt: jobs.createdAt,
         companyId: jobs.companyId,
        company: companies,
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(eq(jobs.active, true), planCondition))
      .orderBy(desc(jobs.order), desc(jobs.createdAt))
      .limit(100);

    return {
      // Shuffle the data
      data: data?.sort(() => Math.random() - 0.5),
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getJobs() {
  try {
    const data = await db
      .select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          location: jobs.location,
          link: jobs.link,
          workplace: jobs.workplace,
          experience: jobs.experience,
          plan: jobs.plan,
          order: jobs.order,
          active: jobs.active,
          createdAt: jobs.createdAt,
          companyId: jobs.companyId,
          owner_id: companies.ownerId,
          company: companies,
        })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.active, true))
      .orderBy(desc(jobs.createdAt))
      .limit(1000);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getJobsByCompany(slug: string) {
  try {
    const data = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        location: jobs.location,
        link: jobs.link,
        workplace: jobs.workplace,
        experience: jobs.experience,
        plan: jobs.plan,
        order: jobs.order,
        active: jobs.active,
        createdAt: jobs.createdAt,
        companyId: jobs.companyId,
        owner_id: companies.ownerId,
        companies: companies,
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(companies.slug, slug))
      .orderBy(desc(jobs.createdAt));

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getJobById(id: string) {
  try {
    const data = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        location: jobs.location,
        link: jobs.link,
        workplace: jobs.workplace,
        experience: jobs.experience,
        plan: jobs.plan,
        order: jobs.order,
        active: jobs.active,
        createdAt: jobs.createdAt,
        companyId: jobs.companyId,
        company: companies,
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, id))
      .limit(1);

    return { data: data[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}



export async function getTotalUsers() {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(users);

    return { data: { count: result.count }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getNewUsers() {
  try {
    const data = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(24);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
