# Publish GlideVid to GitHub

Recommended repository: `glidevid-safari` (private during the prototype phase).

## In GitHub

1. Open https://github.com/new and create a **new** repository named `glidevid-safari` in the GitHub account you want to own the project.
2. Select **Private** while it is experimental; public visibility can be enabled after validating site compatibility, permissions and project licensing.
3. If publishing with the commands below, **do not initialize with a README, .gitignore, or license**, because all local files are included here.
4. Ensure your ChatGPT GitHub connection has access to this new repository if you would like the assistant to manage it later.

## Publish locally if GitHub-connected write access is unavailable

Open Terminal from the extracted `GlideVid` directory (not the parent directory). Replace `YOUR_GITHUB_LOGIN` with the repo owner:

```bash
git init -b main
git add .
git commit -m "chore: initialize GlideVid Safari extension prototype"
git remote add origin https://github.com/YOUR_GITHUB_LOGIN/glidevid-safari.git
git push -u origin main
```

If Git prompts for credentials, use GitHub's supported authentication, such as Git Credential Manager or GitHub CLI; do not paste tokens into a chat.

## After first commit

Keep `main` as the prototype baseline. Test on iPad and open specific issues for unsupported AGE iframe hosts, gesture conflicts, fullscreen, and screenshots. Follow `docs/SAFARI-TEST-PLAN.md`.
