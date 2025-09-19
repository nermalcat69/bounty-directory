import Link from "next/link";
import { Avatar } from "../ui/avatar";

interface BoardPostProps {
  post_id: string;
  title: string;
  content: string;
  author_name?: string;
  author_avatar?: string;
  created_at: string;
  slug?: string;
}

export function BoardPost({
  post_id,
  title,
  content,
  author_name,
  author_avatar,
  created_at,
  slug,
}: BoardPostProps) {
  const postUrl = slug ? `/posts/${slug}` : `/posts/${post_id}`;
  
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <Link href={postUrl} className="block">
        <div className="flex items-start gap-3">
          {author_avatar && (
            <Avatar className="w-8 h-8">
              <img src={author_avatar} alt={author_name || "Author"} />
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              {author_name && <span className="font-medium">{author_name}</span>}
              <span>•</span>
              <time dateTime={created_at}>
                {new Date(created_at).toLocaleDateString()}
              </time>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {title}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-3">{content}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}