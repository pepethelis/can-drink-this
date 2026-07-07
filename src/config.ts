export const SITE = {
  website: "https://pepethelis.github.io", // replace this with your deployed domain
  base: "reviews-test", // replace this with your repo name
  author: "pepethelis",
  profile: "https://t.me/kallection",
  desc: "Ваші енергоси вже оглянуті",
  title: "Astro Paper Reviews Test",
  ogImage: "default.png", 
  lightAndDarkMode: true,
  postPerIndex: 7,
  postPerPage: 7,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  giscus: {
    // Disabled: repoId/categoryId below belong to astro-paper-test's
    // Discussions and won't resolve against this repo. Reconfigure at
    // giscus.app for pepethelis/reviews-test before re-enabling.
    enabled: false,
    repo: "pepethelis/astro-paper-test",
    repoId: "R_kgDOSSVlPA",
    category: "General",
    categoryId: "DIC_kwDOSSVlPM4C8Nng",
    mapping: "pathname", // supported options: pathname, url, title
    reactions: "1", // Emoji reactions: 1 = enable / 0 = disable
    emitMetadata: "0",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Europe/Kyiv",
} as const;
