# Handbook custom domain

Target: `https://docs.sapiensfirst.org/`, served by the existing `Sapiens-First/docs` GitHub Pages workflow. This is a hosting-address change for the existing public handbook.

## Cutover

1. Prepare and verify the root-base build on `codex/docs-custom-domain`. Do not publish this build to `main` while the site still serves only at `/docs/`; root asset URLs would be wrong there.
2. In the repository's GitHub Pages settings, set Custom domain to `docs.sapiensfirst.org`. Configure this before pointing DNS at GitHub. The existing publishing source is GitHub Actions; GitHub ignores a `CNAME` file for this publishing mode.
3. In Namecheap's Advanced DNS for `sapiensfirst.org`, add exactly one CNAME: host `docs`, value `sapiens-first.github.io`, TTL Automatic. The value is a hostname, with no `https://` or `/docs/` path. Check for existing records at `docs` first; preserve all other records.
4. Publish the verified build to `main` through the existing workflow. Confirm the Pages job finishes successfully.
5. Verify authoritative and public DNS, then GitHub's certificate status. Enable Enforce HTTPS when the certificate is available; certificate issuance may take time.
6. Verify the home page, a chapter, navigation, styles/images, local search, legacy route redirects, HTML/PDF/EPUB downloads, sitemap and Markdown exports. Confirm old `https://sapiens-first.github.io/docs/` links redirect to the corresponding custom-domain pages.

The source changes set VitePress's base to `/`, update canonical/sitemap/robots/export URLs, and make book links use the configured site address. The existing workflow and content remain the source of truth.

## Rollback

If cutover fails, restore the previous root-base and URL changes by reverting the migration commit and redeploying; clear the Pages custom domain and remove only the new `docs` CNAME. Verify the original GitHub Pages URL again. Retain evidence of settings and DNS before each change.

## References

- [GitHub: managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [VitePress: deploying to GitHub Pages](https://vitepress.dev/guide/deploy#github-pages)
