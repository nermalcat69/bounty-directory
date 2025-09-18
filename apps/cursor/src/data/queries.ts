import { db } from "@/db";
import { users, posts, votes, followers, companies, jobs, mcps } from "@/db/schema";
import { eq, and, desc, count, or, asc, ne, ilike } from "drizzle-orm";

export async function getUserProfile(slug: string, userId?: string) {
  const whereConditions = userId 
    ? and(eq(users.slug, slug), eq(users.id, userId))
    : and(eq(users.slug, slug), eq(users.public, true));

  const userData = await db
    .select()
    .from(users)
    .where(whereConditions)
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

  // Get follower and following counts
  const [followerCount] = await db
    .select({ count: count() })
    .from(followers)
    .where(eq(followers.followingId, user.id));

  const [followingCount] = await db
    .select({ count: count() })
    .from(followers)
    .where(eq(followers.followerId, user.id));

  return {
    data: {
      ...user,
      social_x_link: user.socialXLink,
      follow_email: user.followEmail,
      created_at: user.createdAt,
      follower_count: user.followerCount,
      following_count: followingCount?.count || 0,
      followers_count: followerCount?.count || 0,
      is_following: false, // This would need to be calculated based on current user
      posts: userPosts.map((post) => ({
        ...post,
        user_avatar: user.image,
        user_name: user.name,
        vote_count: post.voteCount,
      })),
    },
  };
}

export async function getUserFollowers(id: string) {
  try {
    const data = await db
      .select({
        follower: {
          id: users.id,
          name: users.name,
          image: users.image,
          slug: users.slug,
          website: users.website,
          socialXLink: users.socialXLink,
        },
      })
      .from(followers)
      .innerJoin(users, eq(followers.followerId, users.id))
      .where(eq(followers.followingId, id));

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getUserFollowing(id: string) {
  try {
    const data = await db
      .select({
        following: {
          id: users.id,
          name: users.name,
          image: users.image,
          slug: users.slug,
          website: users.website,
          socialXLink: users.socialXLink,
        },
      })
      .from(followers)
      .innerJoin(users, eq(followers.followingId, users.id))
      .where(eq(followers.followerId, id));

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

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
        user_slug: users.slug,
      })
      .from(posts)
      .leftJoin(votes, eq(posts.id, votes.postId))
      .leftJoin(users, eq(posts.userId, users.id))
      .groupBy(posts.id, users.id, users.name, users.image, users.slug)
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
        user_slug: post.user_slug || "",
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

export async function getFeaturedMCPs({
  onlyPremium,
}: {
  onlyPremium?: boolean;
} = {}) {
  try {
    const planCondition = onlyPremium 
      ? eq(mcps.plan, "premium")
      : or(eq(mcps.plan, "featured"), eq(mcps.plan, "premium"));

    const data = await db
      .select()
      .from(mcps)
      .where(and(eq(mcps.active, true), planCondition))
      .orderBy(desc(mcps.createdAt), desc(mcps.order), desc(mcps.createdAt))
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
        slug: users.slug,
        name: users.name,
        image: users.image,
      })
      .from(users)
      .where(eq(users.public, true))
      .orderBy(desc(users.createdAt))
      .limit(24);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMCPs({
  page = 1,
  limit = 36,
}: {
  page?: number;
  limit?: number;
} = {}) {
  try {
    const data = await db
      .select()
      .from(mcps)
      .where(eq(mcps.active, true))
      .orderBy(asc(mcps.companyId))
      .limit(limit)
      .offset((page - 1) * limit);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMCPBySlug(slug: string) {
  try {
    const data = await db
      .select({
        id: mcps.id,
        name: mcps.name,
        slug: mcps.slug,
        description: mcps.description,
        repository: mcps.repository,
        npmPackage: mcps.npmPackage,
        companyId: mcps.companyId,
        plan: mcps.plan,
        active: mcps.active,
        order: mcps.order,
        createdAt: mcps.createdAt,
        owner_id: companies.ownerId,
        company: {
          id: companies.id,
          name: companies.name,
          slug: companies.slug,
          image: companies.image,
          ownerId: companies.ownerId,
        },
      })
      .from(mcps)
      .leftJoin(companies, eq(mcps.companyId, companies.id))
      .where(eq(mcps.slug, slug))
      .limit(1);

    return { data: data[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

type GetMembersParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export async function getMembers({
  page = 1,
  limit = 33,
  q,
}: GetMembersParams = {}) {
  try {
    let query = db
      .select()
      .from(users)
      .where(and(eq(users.public, true), ne(users.name, "unknown user")))
      .orderBy(desc(users.followerCount), desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Note: Text search functionality would need to be implemented differently in Drizzle
    // For now, we'll do a simple name filter if q is provided
    if (q) {
      query = db
        .select()
        .from(users)
        .where(and(
          eq(users.public, true), 
          ne(users.name, "unknown user"),
          ilike(users.name, `%${q}%`)
        ))
        .orderBy(desc(users.followerCount), desc(users.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    }

    const data = await query;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
