import type { Props } from "astro";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconTelegram from "@/assets/icons/IconTelegram.svg";

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
    href: "https://github.com/pepethelis/can-drink-this",
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
    name: "super_skrull",
    href: "https://t.me/super_skrulling",
    icon: IconTelegram,
  },
  {
    name: "decepti_on",
    href: "https://t.me/sonechkin_rzekich",
    icon: IconTelegram,
  },
  {
    name: "sanb_s",
    href: "https://t.me/ukr_satan",
    icon: IconTelegram,
  },
];

export const SPONSORS: Person[] = [
  {
    name: "gdgood",
    href: "https://t.me/dekanat_tef",
    icon: IconTelegram,
  },
  {
    name: "ritual_huitual",
    href: "https://t.me/whatchadoinghereguyz",
    icon: IconTelegram,
  },
  {
    name: "ukrainian_simple_guy",
    href: "https://t.me/ukrainian_simple_guy",
    icon: IconTelegram,
  },
  {
    name: "makmed1337",
    href: "https://t.me/ed_shitpost",
    icon: IconTelegram,
  },
];
