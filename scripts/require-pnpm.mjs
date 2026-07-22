const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("\nDự án này chỉ hỗ trợ pnpm.");
  console.error("Hãy chạy: corepack enable");
  console.error("Sau đó chạy: pnpm install\n");
  process.exit(1);
}
