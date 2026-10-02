# Publishing recreation demos

Each recreation uses its own GitHub Pages **project site**:

```text
https://<owner>.github.io/<repository>/
```

This keeps releases independent. Adding another recreation does not require changing a shared homepage repository or another project's deployment.

## Add another project

1. Keep a reproducible `npm ci` install and an `npm run build` command that writes the public site to `dist`.
2. For a Vite single-page demo, keep `base: './'` so assets resolve under the repository's path.
3. Copy `.github/workflows/ci.yml` and enable **Settings → Pages → GitHub Actions** in the new repository.
4. Push to the default branch or manually run the workflow on that branch.
5. Add the resulting HTTPS URL to the README and repository About section.

The workflow derives the default branch from GitHub metadata and contains no repository name. Pull requests and other branches only build. The default branch publishes after its build succeeds. Deployment permissions are limited to the deploy job, and no personal access token is stored in the repository.

Build and deployment concurrency are scoped to this repository. A new build can replace an older build of the same ref; an active Pages deployment is allowed to finish. Official actions are pinned to immutable commits, with their release versions recorded beside them.

Only the `dist` artifact is uploaded. Source folders, local files, documentation previews, and repository history are not published as website files.
