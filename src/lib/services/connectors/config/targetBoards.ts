// src/lib/services/connectors/config/targetBoards.ts
/**
 * Configurable Target Company Boards for Authorized ATS Providers
 */

export interface TargetBoardConfig {
  companyName: string;
  boardToken: string;
  domain?: string;
  enabled?: boolean;
  priorityRoles?: RegExp[];
  maxJobs?: number;
}

export interface ProviderBoardsConfig {
  [sourceId: string]: TargetBoardConfig[];
}

/**
 * Initial curated list of reputable companies utilizing official public ATS feeds.
 */
export const DEFAULT_TARGET_BOARDS: ProviderBoardsConfig = {
  greenhouse: [
    {
      companyName: "Cloudflare",
      boardToken: "cloudflare",
      domain: "cloudflare.com",
      enabled: true,
      maxJobs: 5,
    },
    {
      companyName: "Figma",
      boardToken: "figma",
      domain: "figma.com",
      enabled: true,
      maxJobs: 5,
    },
    {
      companyName: "GitLab",
      boardToken: "gitlab",
      domain: "gitlab.com",
      enabled: true,
      maxJobs: 5,
    },
    {
      companyName: "Datadog",
      boardToken: "datadog",
      domain: "datadoghq.com",
      enabled: true,
      maxJobs: 5,
    },
    {
      companyName: "Affirm",
      boardToken: "affirm",
      domain: "affirm.com",
      enabled: true,
      maxJobs: 4,
    },
  ],
  lever: [
    {
      companyName: "Spotify",
      boardToken: "spotify",
      domain: "spotify.com",
      enabled: true,
      maxJobs: 4,
    },
    {
      companyName: "Kinsta",
      boardToken: "kinsta",
      domain: "kinsta.com",
      enabled: true,
      maxJobs: 4,
    },
    {
      companyName: "Courier",
      boardToken: "courier",
      domain: "courier.com",
      enabled: true,
      maxJobs: 4,
    },
  ],
  ashby: [
    {
      companyName: "Notion",
      boardToken: "notion",
      domain: "notion.com",
      enabled: true,
      maxJobs: 5,
    },
    {
      companyName: "Linear",
      boardToken: "linear",
      domain: "linear.app",
      enabled: true,
      maxJobs: 4,
    },
    {
      companyName: "Ramp",
      boardToken: "ramp",
      domain: "ramp.com",
      enabled: true,
      maxJobs: 4,
    },
  ],
};

// In-memory configurable registry of target boards
const activeBoards: ProviderBoardsConfig = {
  greenhouse: [...DEFAULT_TARGET_BOARDS.greenhouse],
  lever: [...DEFAULT_TARGET_BOARDS.lever],
  ashby: [...DEFAULT_TARGET_BOARDS.ashby],
};

/**
 * Retrieves the list of target company boards for a given provider.
 */
export function getTargetBoards(sourceId: string): TargetBoardConfig[] {
  return (activeBoards[sourceId] || []).filter((b) => b.enabled !== false);
}

/**
 * Adds or updates a target company board for a provider.
 */
export function setTargetBoard(
  sourceId: string,
  board: TargetBoardConfig
): void {
  if (!activeBoards[sourceId]) {
    activeBoards[sourceId] = [];
  }
  const existingIdx = activeBoards[sourceId].findIndex(
    (b) => b.boardToken.toLowerCase() === board.boardToken.toLowerCase()
  );
  if (existingIdx !== -1) {
    activeBoards[sourceId][existingIdx] = { ...board };
  } else {
    activeBoards[sourceId].push({ ...board });
  }
}

/**
 * Removes a target company board from a provider.
 */
export function removeTargetBoard(sourceId: string, boardToken: string): boolean {
  if (!activeBoards[sourceId]) return false;
  const initialLen = activeBoards[sourceId].length;
  activeBoards[sourceId] = activeBoards[sourceId].filter(
    (b) => b.boardToken.toLowerCase() !== boardToken.toLowerCase()
  );
  return activeBoards[sourceId].length < initialLen;
}

/**
 * Resets target boards to initial configuration (useful for testing).
 */
export function resetTargetBoards(): void {
  activeBoards.greenhouse = [...DEFAULT_TARGET_BOARDS.greenhouse];
  activeBoards.lever = [...DEFAULT_TARGET_BOARDS.lever];
  activeBoards.ashby = [...DEFAULT_TARGET_BOARDS.ashby];
}
