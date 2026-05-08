# Deployment

Live site: https://baditaflorin.github.io/podcast-postline/

GitHub Pages serves this repository from the `main` branch `/docs` folder.

## Republish

Run:

```sh
make build
git add docs
git commit -m "chore: publish pages"
git push
```

## Rollback

Revert the publishing commit and push `main` again.

## Custom Domain

No custom domain is configured for v1. If one is added later, place the domain in `docs/CNAME` and configure DNS according to GitHub Pages documentation.

