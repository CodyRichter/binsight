/** The command that connects Claude Code to this Binsight with an MCP credential's secret. */
export function claudeCodeCommand(origin: string, secret: string): string {
  return `claude mcp add --transport http binsight ${origin}/mcp --header "Authorization: Bearer ${secret}"`;
}
