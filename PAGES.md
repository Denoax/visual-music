# Visual Music on GitHub Pages

Source: **https://github.com/Denoax/visual-music**

Website: **https://denoax.github.io/visual-music/**

Source code, exact bundled recording, credits and website build belong to one repository. The [Pages workflow](.github/workflows/pages.yml) installs the lockfile with Node 22.23.2, runs tests and show validation, builds Vite, verifies the recording hash and uploads only `dist/`. A successful build deploys through the `github-pages` environment. Normal pushes to `main` update the site; `workflow_dispatch` can retry the same revision. Configure this repository's Pages source as **GitHub Actions**, rather than a branch directory.

The live [deployment receipt](https://denoax.github.io/visual-music/deployment.json) identifies the exact source commit and lists production-file hashes. It is generated after the build and does not change rendering or audio. Relative Vite URLs preserve the `/visual-music/` path. No account-root site or custom domain is involved.

For local verification:

```sh
npm ci
npm test
npm run validate
npm run build
node tools/pages-receipt.mjs
npm run preview -- --port 4175 --strictPort
```

The old `Denoax/bumer-exe` source history and the preceding compiled-site history are both ancestors of the consolidation commit. Their previous separation and source-only restrictions are historical. The previous Pages receipt is retained in [the consolidation evidence](evidence/repository-consolidation/previous-pages-deployment.json). Local review history, ignored assets, original captures and recovery bundles remain preserved outside the public build.

Repository consolidation changes publication, not the approved scene. Build hashes and browser checks establish technical equivalence; they do not constitute fresh human listening, physical-device, motion or performance approval.
