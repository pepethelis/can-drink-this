import type { Props } from "astro";
import IconMail from "@/assets/icons/IconMail.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconWhatsapp from "@/assets/icons/IconWhatsapp.svg";
import IconFacebook from "@/assets/icons/IconFacebook.svg";
import IconTelegram from "@/assets/icons/IconTelegram.svg";
import IconPinterest from "@/assets/icons/IconPinterest.svg";

// #region Socials and share links

interface Social {
  name: string;
  href: string;
  linkTitle: string;
  icon: (_props: Props) => Element;
}

export const SOCIALS: Social[] = [
  {
    name: "GitHub",
    href: "https://github.com/pepethelis/astro-paper-test",
    linkTitle: `GitHub`,
    icon: IconGitHub,
  },
  {
    name: "Telegram",
    href: "https://t.me/kallection",
    linkTitle: `Канал в Telegram`,
    icon: IconTelegram,
  },
] as const;

export const SHARE_LINKS: Social[] = [
  {
    name: "WhatsApp",
    href: "https://wa.me/?text=",
    linkTitle: `Share this post via WhatsApp`,
    icon: IconWhatsapp,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/sharer.php?u=",
    linkTitle: `Share this post on Facebook`,
    icon: IconFacebook,
  },
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: `Share this post on X`,
    icon: IconBrandX,
  },
  {
    name: "Telegram",
    href: "https://t.me/share/url?url=",
    linkTitle: `Share this post via Telegram`,
    icon: IconTelegram,
  },
  {
    name: "Pinterest",
    href: "https://pinterest.com/pin/create/button/?url=",
    linkTitle: `Share this post on Pinterest`,
    icon: IconPinterest,
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: `Share this post via email`,
    icon: IconMail,
  },
] as const;

// #endregion

// #region Persons

interface Person {
  name: string;
  href: string;
  icon: (_props: Props) => Element;
}

export const AUTHORS: Person[] = [
  {
    name: "pepethelis",
    href: "https://t.me/kallection",
    icon: IconTelegram,
  },
  {
    name: "skrull",
    href: "https://t.me/super_skrulling",
    icon: IconTelegram,
  },
  {
    name: "decepti_on",
    href: "https://t.me/sonechkin_rzekich",
    icon: IconTelegram,
  },
  {
    name: "ukr_satan",
    href: "https://t.me/ukr_satan",
    icon: IconTelegram,
  },
];

export const SPONSORS: Person[] = [
  {
    name: "gdgood",
    href: "https://t.me/gdgood",
    icon: IconTelegram,
  },
  {
    name: "ritual_huitual",
    href: "https://t.me/ritual_huitual",
    icon: IconTelegram,
  },
  {
    name: "ukrainian_simple_guy",
    href: "https://t.me/ukrainian_simple_guy",
    icon: IconTelegram,
  },
];
