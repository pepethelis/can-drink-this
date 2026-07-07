import type { CollectionEntry } from "astro:content";
import { SITE } from "@/config";

type PostData =
  | Omit<CollectionEntry<"reviews">, "id" | "collection">
  | Omit<CollectionEntry<"posts">, "id" | "collection">;

const postFilter = ({
  data,
}: PostData) => {
  if (!data.publishedAt) {
    return false;
  }

  if ("category" in data && data.category === "власні огляди") {
    const isStatusAllowed = !["prebuild", "to create"].includes(data.status);
    if (!isStatusAllowed) {
      return false;
    }
  }

  const isPublishTimePassed =
    Date.now() >
    new Date(data.publishedAt).getTime() - SITE.scheduledPostMargin;
  return !data.hidden && (import.meta.env.DEV || isPublishTimePassed);
};

export default postFilter;
