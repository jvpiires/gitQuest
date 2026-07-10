import { getSupabaseAdmin } from "@gitquest/database";

export interface GithubStatsSnapshot {
  commits: number;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  issuesClosed: number;
  codeReviews: number;
  releases: number;
  starsAndForks: number;
}

export interface GithubXpBreakdown extends GithubStatsSnapshot {
  commitsXp: number;
  pullRequestsOpenedXp: number;
  pullRequestsMergedXp: number;
  issuesClosedXp: number;
  codeReviewsXp: number;
  releasesXp: number;
  starsAndForksXp: number;
  totalXp: number;
}

export const GITHUB_XP_TABLE = {
  commit: 10,
  pullRequestOpened: 30,
  pullRequestMerged: 80,
  issueClosed: 40,
  codeReview: 25,
  release: 120,
  starOrFork: 5,
} as const;

type GithubRepo = {
  full_name: string;
  owner?: { login?: string };
  stargazers_count?: number;
  forks_count?: number;
};

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

function githubHeaders(extra?: Record<string, string>): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    "User-Agent": "GitQuest-App",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function githubRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const mergedHeaders = {
    ...githubHeaders(),
    ...(init?.headers ? init.headers : {}),
  };

  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: mergedHeaders,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub API falhou (${response.status}) em ${path}`);
  }

  return (await response.json()) as T;
}

async function githubSearchCount(path: string): Promise<number> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: githubHeaders(),
    cache: "no-store",
  });

  if (!response.ok) return 0;
  const data = (await response.json()) as { total_count?: number };
  return typeof data.total_count === "number" ? data.total_count : 0;
}

function parseLastPageFromLink(linkHeader: string | null): number {
  if (!linkHeader) return 1;
  const lastPart = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.endsWith('rel="last"'));

  if (!lastPart) return 1;

  const pattern = /[?&]page=(\d+)/;
  const match = pattern.exec(lastPart);
  if (!match) return 1;
  return Number.parseInt(match[1], 10) || 1;
}

async function countRepoReleases(fullName: string): Promise<number> {
  const response = await fetch(`${GITHUB_API}/repos/${fullName}/releases?per_page=1&page=1`, {
    headers: githubHeaders(),
    cache: "no-store",
  });

  if (response.status === 404) return 0;
  if (!response.ok) return 0;

  const releases = (await response.json()) as Array<unknown>;
  const lastPage = parseLastPageFromLink(response.headers.get("link"));

  if (lastPage > 1) return lastPage;
  return releases.length;
}

async function fetchOwnedRepos(username: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = [];
  let page = 1;

  while (page <= 10) {
    const chunk = await githubRequest<GithubRepo[]>(
      `/users/${username}/repos?per_page=100&page=${page}&sort=updated`
    );

    if (!chunk.length) break;
    repos.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
  }

  return repos.filter((repo) => repo.owner?.login?.toLowerCase() === username.toLowerCase());
}

export async function collectGithubStats(username: string): Promise<GithubStatsSnapshot> {
  const [repos, commits, pullRequestsOpened, pullRequestsMerged, issuesClosed, codeReviews] = await Promise.all([
    fetchOwnedRepos(username),
    githubSearchCount(`/search/commits?q=author:${encodeURIComponent(username)}&per_page=1`),
    githubSearchCount(`/search/issues?q=author:${encodeURIComponent(username)}+type:pr&per_page=1`),
    githubSearchCount(`/search/issues?q=author:${encodeURIComponent(username)}+type:pr+is:merged&per_page=1`),
    githubSearchCount(`/search/issues?q=author:${encodeURIComponent(username)}+type:issue+is:closed&per_page=1`),
    githubSearchCount(`/search/issues?q=reviewed-by:${encodeURIComponent(username)}+type:pr&per_page=1`),
  ]);

  const starsAndForks = repos.reduce((sum, repo) => {
    return sum + (repo.stargazers_count || 0) + (repo.forks_count || 0);
  }, 0);

  let releases = 0;
  for (const repo of repos.slice(0, 30)) {
    releases += await countRepoReleases(repo.full_name);
  }

  return {
    commits,
    pullRequestsOpened,
    pullRequestsMerged,
    issuesClosed,
    codeReviews,
    releases,
    starsAndForks,
  };
}

export function calculateGithubXp(snapshot: GithubStatsSnapshot): GithubXpBreakdown {
  const commitsXp = snapshot.commits * GITHUB_XP_TABLE.commit;
  const pullRequestsOpenedXp = snapshot.pullRequestsOpened * GITHUB_XP_TABLE.pullRequestOpened;
  const pullRequestsMergedXp = snapshot.pullRequestsMerged * GITHUB_XP_TABLE.pullRequestMerged;
  const issuesClosedXp = snapshot.issuesClosed * GITHUB_XP_TABLE.issueClosed;
  const codeReviewsXp = snapshot.codeReviews * GITHUB_XP_TABLE.codeReview;
  const releasesXp = snapshot.releases * GITHUB_XP_TABLE.release;
  const starsAndForksXp = snapshot.starsAndForks * GITHUB_XP_TABLE.starOrFork;

  const totalXp =
    commitsXp +
    pullRequestsOpenedXp +
    pullRequestsMergedXp +
    issuesClosedXp +
    codeReviewsXp +
    releasesXp +
    starsAndForksXp;

  return {
    ...snapshot,
    commitsXp,
    pullRequestsOpenedXp,
    pullRequestsMergedXp,
    issuesClosedXp,
    codeReviewsXp,
    releasesXp,
    starsAndForksXp,
    totalXp,
  };
}

function levelFromXp(totalXp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalXp) / 50)) + 1;
}

export async function syncGithubXpForUser(userId: string) {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, github_username, total_xp, github_xp_total, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Perfil não encontrado.");
  if (!profile.github_username) throw new Error("Usuário sem github_username no profile.");

  const snapshot = await collectGithubStats(profile.github_username);
  const breakdown = calculateGithubXp(snapshot);

  const previousGithubXp = profile.github_xp_total || 0;
  const baseXp = Math.max(0, (profile.total_xp || 0) - previousGithubXp);
  const totalXp = baseXp + breakdown.totalXp;
  const xpDelta = breakdown.totalXp - previousGithubXp;
  const avatarUrl =
    profile.avatar_url ||
    `https://avatars.githubusercontent.com/${encodeURIComponent(profile.github_username)}?size=128`;

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      total_xp: totalXp,
      current_level: levelFromXp(totalXp),
      github_xp_total: breakdown.totalXp,
      github_xp_snapshot: breakdown,
      avatar_url: avatarUrl,
      last_github_sync_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) throw new Error(updateError.message);

  const { error: logError } = await admin.from("quest_logs").insert({
    user_id: profile.id,
    action_type: "GITHUB_SYNC",
    xp_gained: xpDelta,
    description: `Sync GitHub completo para ${profile.github_username}`,
  });

  if (logError) {
    console.error("Falha ao registrar quest log de sync:", logError.message);
  }

  return {
    userId: profile.id,
    githubUsername: profile.github_username,
    totalXp,
    baseXp,
    githubXpTotal: breakdown.totalXp,
    xpDelta,
    breakdown,
  };
}
