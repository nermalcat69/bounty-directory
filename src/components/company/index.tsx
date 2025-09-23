import { getCompanyProfile } from "@/data/queries";
import { getSession } from "@/lib/auth-server";
import { format } from "date-fns";
import { CompanyContent } from "./company-content";
import { CompanyHeader } from "./company-header";
import { CompanyHero } from "./company-hero";

export async function Company({
  slug,
  isCompanyPage = false,
}: {
  slug: string;
  isCompanyPage?: boolean;
}) {
  const session = await getSession();
  const { data } = await getCompanyProfile(
    slug,
    isCompanyPage ? session?.user?.id : undefined,
  );

  const isOwner = session?.user?.id === data?.ownerId;

  if (!data) {
    return (
      <div className="flex justify-center items-center -mt-28 w-full h-screen text-sm text-[#878787]">
        Company not found
      </div>
    );
  }

  return (
    <div className="w-full">
      <CompanyHero companyId={data?.id} isOwner={isOwner} hero={data?.hero || ""} />

      <CompanyHeader
        id={data?.id}
        image={data?.image}
        name={data?.name}
        location={""} // location field doesn't exist in companies schema
        isOwner={isOwner}
        bio={data?.description || ""}
        website={data?.website || ""}
        social_x_link={""} // social_x_link field doesn't exist in companies schema
        is_public={true} // public field doesn't exist in companies schema, defaulting to true
        slug={data?.slug}
      />

      <CompanyContent
        bio={data?.description || ""}
        website={data?.website || ""}
        social_x_link={""} // social_x_link field doesn't exist in companies schema
      />

      <div className="my-14 space-y-10 w-full">
        <div className="text-sm text-[#878787] flex justify-between items-center border-t border-border pt-6">
          <span>Joined Bounty Directory</span>
          {data?.createdAt ? format(new Date(data.createdAt), "MMM d, yyyy") : "Unknown"}
        </div>
      </div>
    </div>
  );
}
