/**
 * Real configuration state, read from the environment.
 *
 * Nothing here invents a value. If a service is unconfigured the UI says so —
 * that is the honest empty state, and it is what the deployment renders until
 * phase 1 wires the first real read.
 */

export type ServiceName =
  | "safe"
  | "keeperhub-read"
  | "keeperhub-write"
  | "database"
  | "agent";

export type ServiceStatus = {
  readonly name: ServiceName;
  readonly label: string;
  readonly configured: boolean;
  readonly detail: string;
};

/**
 * An env var present but empty is unset, not set-to-empty. `??` does not catch that,
 * and the difference is visible on screen the moment a key exists but a value does not.
 */
function present(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function serviceStatuses(): readonly ServiceStatus[] {
  const env = process.env;
  return [
    {
      name: "safe",
      label: "Safe Transaction Service",
      configured: present(env.SAFE_API_KEY) !== null,
      detail: "developer.safe.global → API Keys",
    },
    {
      name: "keeperhub-read",
      label: "KeeperHub · dry run",
      configured: present(env.KEEPERHUB_API_KEY_READ) !== null,
      detail: "mcp:read — simulates, cannot broadcast",
    },
    {
      name: "keeperhub-write",
      label: "KeeperHub · execute",
      configured: present(env.KEEPERHUB_API_KEY_WRITE) !== null,
      detail: "mcp:read mcp:write — the only key that can broadcast",
    },
    {
      name: "database",
      label: "Postgres",
      configured: present(env.DATABASE_URL) !== null,
      detail: "stores intent and calldata before proposing",
    },
    {
      name: "agent",
      label: "Agent model",
      configured: present(env.ANTHROPIC_API_KEY) !== null,
      detail: "composes the treasury action",
    },
  ];
}

export function watchedSafe(): { address: string | null; chainId: number } {
  return {
    address: present(process.env.NEXT_PUBLIC_SAFE_ADDRESS),
    chainId: Number(present(process.env.NEXT_PUBLIC_CHAIN_ID) ?? 11155111),
  };
}
