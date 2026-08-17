# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x (latest) | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability in RunPort, please **do not open a public GitHub Issue**.

Instead, report it privately by:
1. Going to the [GitHub Security Advisories](https://github.com/Ayush-Antiwal/RunPort/security/advisories/new) page for this repo.
2. Or contacting the maintainer directly through GitHub.

### What to include
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

We aim to respond within **72 hours** and will work with you to resolve the issue before any public disclosure.

## Scope

RunPort is a local desktop application — it manages local dev server processes and does not send any data to external servers. All project data is stored locally on your machine.

Security concerns relevant to this project include:
- Arbitrary command execution via crafted project configurations
- Path traversal vulnerabilities in project folder handling
- IPC context bridge exposure
