---
name: security-audit
description: Audit code for OWASP Top 10 vulnerabilities and security anti-patterns
metadata:
  role: security
  tags: [security, audit, owasp]
---
# Security Audit

Perform a comprehensive security review of the provided code:

1. **Injection**: SQL injection, command injection, XSS, template injection
2. **Auth**: Broken authentication, session management, JWT misuse
3. **Access**: Broken access control, IDOR, privilege escalation
4. **Exposure**: Sensitive data in logs, error messages, or API responses
5. **Config**: Security misconfiguration, default credentials, debug mode
6. **Dependencies**: Known vulnerabilities in imported packages

Rate each finding: CRITICAL / HIGH / MEDIUM / LOW
Provide fix recommendations with code examples.
