/**
 * Latest-release lookup, so download buttons never go stale.
 *
 * The pages used to hardcode a version and a filename ("Download v0.8.17 ·
 * MSI · 51 MB"), which means every release makes the site wrong until someone
 * remembers to edit the HTML. This asks GitHub instead.
 *
 * Server-side rather than fetching GitHub from the browser for two reasons:
 * GitHub's unauthenticated rate limit is 60 requests/hour per IP, which a
 * visitor's office or campus NAT can exhaust for everyone behind it; and a
 * single shared server response can be cached at the edge, so GitHub sees one
 * request per hour, not one per visitor.
 */

const REPOS = {
  voidtune: 'otzpt/VOIDTUNE',
  'one-click': 'otzpt/Voidtune-one-click',
  'v-agent': 'otzpt/V-Agent',
};

const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Picks the asset a person on a desktop actually wants: an installer over a
 * portable archive, and never the source-code tarballs GitHub attaches to
 * every release automatically.
 */
const pickAsset = (assets) => {
  const usable = assets.filter((asset) => !/^Source code/i.test(asset.name));
  const byPreference = ['.msi', '.exe', '.zip', '.tar.zst', '.deb'];
  for (const extension of byPreference) {
    const match = usable.find((asset) => asset.name.toLowerCase().endsWith(extension));
    if (match) return match;
  }
  return usable[0];
};

export default async function handler(req, res) {
  const key = String(req.query?.repo ?? 'voidtune');
  const repo = REPOS[key];
  if (!repo) {
    return res.status(400).json({ error: `unknown repo "${key}"`, known: Object.keys(REPOS) });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'voidtune-website',
        // Optional: lifts the rate limit from 60/hr to 5000/hr. The endpoint
        // works without it -- the edge cache below keeps usage far under 60.
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!response.ok) throw new Error(`GitHub responded ${response.status}`);

    const release = await response.json();
    const asset = pickAsset(release.assets ?? []);

    // Serve from the edge cache for an hour, and keep serving the stale copy
    // for a day while revalidating -- a GitHub outage should degrade the
    // button to "slightly out of date", never to broken.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      repo,
      // Every downloadable asset, so a page with more than one download link
      // (installer AND portable zip) can pick the right file per link rather
      // than pointing them all at the same one.
      assets: (release.assets ?? [])
        .filter((a) => !/^Source code/i.test(a.name))
        .map((a) => ({
          name: a.name,
          url: a.browser_download_url,
          size: megabytes(a.size),
          kind: a.name.split('.').pop().toUpperCase(),
        })),
      version: release.tag_name,
      name: release.name,
      published: release.published_at,
      url: asset?.browser_download_url ?? release.html_url,
      filename: asset?.name ?? null,
      size: asset ? megabytes(asset.size) : null,
      kind: asset ? asset.name.split('.').pop().toUpperCase() : null,
      releases: release.html_url,
    });
  } catch (error) {
    // The page keeps its hardcoded fallback text when this fails, so a bad
    // response must be loud here rather than silently shipping a broken link.
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(502).json({ error: String(error.message ?? error) });
  }
}
