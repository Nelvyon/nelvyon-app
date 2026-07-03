export const dynamic = "force-dynamic";

export async function GET() {
  const gitSha =
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
    process.env.BUILD_GIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    null;

  return Response.json(
    {
      ok: true,
      git_sha: gitSha ? gitSha.slice(0, 12) : null,
    },
    { status: 200 },
  );
}
