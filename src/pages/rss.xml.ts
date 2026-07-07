import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { SITE } from "@/config";
import postFilter from "@/utils/postFilter";

export async function GET() {
  const posts = await getCollection("reviews", ({ data }) =>
    postFilter({ data })
  );
  const sortedPosts = getSortedPosts(posts);
  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: sortedPosts.map(({ data, id, filePath }) => ({
      link: getPath(id, filePath),
      title: data.aliases[0], // use the first alias as the title
      description: data.summary ?? '',
      publishedAt: new Date(data.updatedAt ?? data.publishedAt ?? new Date()),
    })),
  });
}
