# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in PreRoll.io, please report it responsibly. **Do not open a public issue.**

Email **trevor@trevorohare.com** with:

- A description of the vulnerability
- Steps to reproduce
- The potential impact
- Any suggested fix (optional)

You should receive an acknowledgment within 48 hours. We'll work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

This policy covers the PreRoll.io codebase and self-hosted deployments. For issues specific to the hosted service at preroll.io (e.g., infrastructure, DNS, SSL), email the same address.

## What Qualifies

- Authentication or authorization bypasses
- SQL injection, XSS, CSRF, or other OWASP Top 10 issues
- Exposure of sensitive data (API keys, tokens, user data)
- Row-level security (RLS) policy bypasses
- Privilege escalation between roles or organizations

## What Doesn't Qualify

- Issues in third-party dependencies (report upstream, but let us know if it affects PreRoll.io)
- Rate limiting or denial of service on the hosted service
- Issues that require physical access to the server
- Social engineering
