const getTitleFormAliases = (aliases: string[]) =>
  aliases[0] || aliases.find(alias => Boolean(alias)) || "Untitled";

export default getTitleFormAliases;
