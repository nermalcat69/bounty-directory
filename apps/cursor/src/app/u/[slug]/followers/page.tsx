import { MembersCard } from "@/components/members/members-card";
import { ProfileTop } from "@/components/profile/profile-top";
import { getUserFollowers, getUserProfile } from "@/data/queries";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;

  const { data } = await getUserProfile(slug);

  return {
    title: `${data?.name}'s Followers | Cursor Directory`,
  };
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;

  const { data } = await getUserProfile(slug);
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center -mt-28 w-full h-screen text-sm text-[#878787]">
        User not found
      </div>
    );
  }

  const { data: followers } = await getUserFollowers(data.id);

  return (
    <div className="flex mx-auto max-w-4xl min-h-screen w-full md:mt-28 mt-14 px-6 lg:px-0">
      <div className="w-full">
        <ProfileTop data={{
          id: data.id,
          hero: data.hero || "",
          image: data.image || "",
          name: data.name || "",
          status: data.status || "",
          bio: data.bio || "",
          work: data.work || "",
          website: data.website || "",
          social_x_link: data.social_x_link || "",
          public: data.public || false,
          slug: data.slug || "",
          is_following: data.is_following || false,
          following_count: data.following_count || 0,
          followers_count: data.followers_count || 0,
        }} isOwner={false} />

        <div className="mt-10">
          <h3 className="text-lg font-mono">Followers</h3>
          <div className="flex flex-col gap-2 mt-4">
            {followers?.length === 0 && (
              <div className="text-sm text-[#878787]">No followers</div>
            )}
            {followers?.map((user) => (
              <MembersCard
                key={user.follower.id}
                member={{
                  slug: user.follower.slug || '',
                  image: user.follower.image || '',
                  name: user.follower.name || '',
                  website: user.follower.website,
                  socialXLink: user.follower.socialXLink,
                }}
                noBorder
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
