---
name: security-audit
description: "Run a focused security audit of the current codebase. Use when you want concrete findings for auth, authorization, validation, XSS, injection, upload safety, tenant isolation, secrets handling, or operational security."
agent: "SaaS-Reviewer"
argument-hint: "Oblast nebo modul pro security audit"
---

Perform a security audit of this codebase.

Focus on:

- authentication and authorization,
- tenant isolation via `cabinId`,
- validation and unsafe input handling,
- file uploads and MIME/size checks,
- exposure of sensitive data,
- deploy and operational risks.

Output findings as a markdown table with these columns:

`ID`, `Severity`, `Issue`, `File Path`, `Line Number(s)`, `Recommendation`

Prioritize exploitable or user-impacting risks first.