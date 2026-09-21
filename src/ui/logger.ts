import pc from "picocolors";

export const log = {
  info: (msg: string) => console.log(pc.cyan("»"), msg),
  success: (msg: string) => console.log(pc.green("✓"), msg),
  warn: (msg: string) => console.log(pc.yellow("!"), msg),
  error: (msg: string) => console.error(pc.red("✗"), msg),
  skip: (msg: string) => console.log(pc.gray("·"), pc.gray(msg)),
  heading: (msg: string) => console.log(pc.bold(msg)),
};
