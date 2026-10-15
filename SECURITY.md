# Security

The current full application is a **local preview**, bound to `127.0.0.1`. Its fictional operator identity is not production authentication. Do not expose local mode through a public tunnel or reverse proxy. Hosted Supabase/Auth/Storage and external integrations require their own deployment review.

## Reporting a vulnerability

Do not post credentials, customer data, working exploits against third parties, or private exports in an issue. Use GitHub's **Security → Report a vulnerability** when private reporting is available for this repository. Otherwise contact the maintainer through the contact channel listed on [their profile](https://github.com/gquthier) and request a private reporting channel before sharing sensitive details. No response-time commitment is currently offered.

Include the affected commit, Node version, operating system, expected behavior and minimal reproduction using synthetic data. State whether the issue affects the lightweight cockpit, the local full application, or an explicitly enabled remote integration.

## Checks

Run the commands in [CONTRIBUTING.md](CONTRIBUTING.md). The CI checks production dependencies with `npm audit --omit=dev --audit-level=low`. This does not replace reviewing development dependencies or the application itself. See [the dependency review](docs/DEPENDENCIES.md) for remaining build-tool alerts and exact scope.

Connection files, `.env` files and personal databases must remain outside Git. Agency-data exports exclude the connection file and agent history, but can contain private customer information and any text the operator entered. Store them privately.
