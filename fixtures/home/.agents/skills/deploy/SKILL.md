---
name: deploy
description: Generate deployment configs — Dockerfiles, CI/CD pipelines, and infrastructure
metadata:
  role: devops
  tags: [deployment, docker, ci-cd, github-actions]
---
# Deploy

Generate production-ready deployment configurations for the current project:

1. **Detect**: Identify project type, runtime, package manager, framework
2. **Dockerfile**: Multi-stage build optimized for size and security (non-root user)
3. **CI/CD**: GitHub Actions workflow — lint, test, build, deploy
4. **Env template**: `.env.example` with all required variables documented
5. **Health check**: `/health` endpoint returning service status and version
6. **Monitoring**: Basic structured logging and error reporting setup

## Best Practices

- Use specific base image tags (not `latest`)
- Cache dependency installation layers
- Run as non-root user in production
- Include `HEALTHCHECK` instruction in Dockerfile
- Use GitHub Environments for staging/production secrets
- Add deployment protection rules for production
