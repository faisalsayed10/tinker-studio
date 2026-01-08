# Security

This document describes the security measures implemented in Tinker Studio and the vulnerabilities that have been addressed.

## Overview

Tinker Studio executes Python code on the server to interact with the Tinker API. This introduces significant security risks if not properly handled. This document outlines the security measures implemented to mitigate these risks.

## Fixed Vulnerabilities

### 1. Code Injection via API Key (CRITICAL - Fixed)

**Issue**: The application was directly interpolating user-provided API keys into Python code strings, allowing arbitrary code execution.

**Attack Vector**:
```
API Key: """; import os; os.system('malicious command'); print("""
```

**Fix**:
- API keys are now passed via environment variables to the Python process, not embedded in code
- API keys are validated to only contain safe characters (alphanumeric, hyphens, underscores, dots)
- Maximum length restrictions enforced (20-200 characters)

**Affected Files**:
- `src/app/api/tinker/validate/route.ts`
- `src/app/api/tinker/models/route.ts`
- `src/app/api/tinker/cleanup/route.ts`
- `src/app/api/checkpoints/list/route.ts`
- `src/app/api/training/start/route.ts`

### 2. Configuration Injection (HIGH - Fixed)

**Issue**: User-controlled configuration values (model names, dataset names, output directories) were directly interpolated into Python code without escaping.

**Attack Vector**:
```json
{
  "model": {
    "baseModel": "model\"; import os; os.system('whoami'); print(\""
  }
}
```

**Fix**:
- All configuration values are validated against a whitelist of safe characters
- Python string escaping applied to all interpolated values
- Reward functions validated against an allowed list
- Maximum length restrictions enforced

**Affected Files**:
- `src/lib/codegen.ts` - Added `escapePythonString()` and `validateSafeIdentifier()`

### 3. Predictable Job IDs (MEDIUM - Fixed)

**Issue**: Job IDs were generated using `Date.now()` and `Math.random()`, making them predictable and enabling unauthorized access to other users' training jobs.

**Fix**:
- Job IDs now use cryptographically secure UUIDs via `crypto.randomUUID()`
- Format: `job_[uuid]`

**Affected Files**:
- `src/app/api/training/start/route.ts`

## Current Security Measures

### Input Validation

All user inputs are validated before processing:

1. **API Keys**:
   - Length: 20-200 characters
   - Characters: alphanumeric, hyphens, underscores, dots only
   - Validation function: `isValidApiKeyFormat()` in `src/lib/security.ts`

2. **Configuration Values**:
   - Model IDs, dataset IDs, paths validated
   - Characters: alphanumeric, hyphens, underscores, slashes, dots only
   - Maximum length: 200 characters
   - Validation function: `validateSafeIdentifier()` in `src/lib/security.ts`

3. **Reward Functions**:
   - Must be one of: `exact_match`, `math_equivalence`, `code_execution`, `custom`
   - Validated in `src/lib/codegen.ts`

### Secure Code Generation

The `generateCode()` function in `src/lib/codegen.ts`:

1. Validates all user inputs before code generation
2. Escapes all string values using `escapePythonString()`
3. Never embeds secrets in generated code
4. API keys passed via environment variables only

### Rate Limiting

A rate limiting utility is available in `src/lib/security.ts`:

```typescript
import { RateLimiter } from "@/lib/security";

const limiter = new RateLimiter(100, 60000); // 100 requests per minute

if (!limiter.checkLimit(clientId)) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

**Note**: Rate limiting is not currently enforced in production. Implement this in middleware for production deployments.

## Remaining Security Concerns

### 1. No Authentication/Authorization (HIGH)

**Current State**: The application accepts API keys directly from client requests without verifying user identity.

**Risks**:
- Anyone can start training jobs if they know a valid API key
- No access control on job streaming or management
- Resource exhaustion attacks possible

**Recommendation**:
- Implement user authentication (e.g., OAuth, JWT)
- Associate jobs with authenticated users
- Validate user ownership before accessing job data

### 2. No Sandboxing (CRITICAL)

**Current State**: Python processes run with full system access.

**Risks**:
- Resource exhaustion (CPU, memory, disk)
- File system access
- Network access
- Fork bombs

**Recommendation**:
- Use Docker containers with resource limits
- Apply seccomp profiles to restrict system calls
- Use read-only file systems where possible
- Implement CPU and memory limits
- Network isolation

Example Docker setup:
```bash
docker run --cpus=2 --memory=4g --network=none \
  --security-opt=seccomp=tinker-seccomp.json \
  python:3.11 python training.py
```

### 3. No Rate Limiting (HIGH)

**Current State**: No request rate limiting is enforced.

**Risks**:
- API key brute forcing
- Denial of service
- Resource exhaustion

**Recommendation**:
- Implement rate limiting middleware
- Use Redis for distributed rate limiting
- Different limits for different endpoints

### 4. Information Disclosure (MEDIUM)

**Current State**: Error messages may reveal system information.

**Risks**:
- Python version disclosure
- File path disclosure
- Stack traces in responses

**Recommendation**:
- Use `sanitizeErrorMessage()` from `src/lib/security.ts`
- Don't return raw error messages in production
- Log detailed errors server-side only

## Security Best Practices

### For Developers

1. **Never trust user input**: Always validate and sanitize
2. **Use parameterized execution**: Pass data via environment variables or arguments, not code strings
3. **Validate against whitelists**: Don't just block known-bad patterns
4. **Escape output**: When generating code, always escape user values
5. **Principle of least privilege**: Run with minimal permissions
6. **Defense in depth**: Multiple layers of security

### For Deployment

1. **Use HTTPS**: Encrypt all traffic
2. **Environment variables**: Store secrets in environment, not code
3. **Monitoring**: Log suspicious activity
4. **Updates**: Keep dependencies updated
5. **Backup**: Regular backups of training data
6. **Incident response**: Have a plan for security incidents

## Security Testing

### Manual Testing

Test input validation:
```bash
# Test API key validation
curl -X POST http://localhost:3000/api/tinker/validate \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "invalid\"\\n; import os; os.system(\"id\"); print(\"\""}'
# Should return: "Invalid API key format"

# Test configuration validation
curl -X POST http://localhost:3000/api/training/start \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "valid-key", "config": {"model": {"baseModel": "test\"; os.system(\"whoami\");\""}}}'
# Should return validation error
```

### Automated Testing

Consider adding security tests:
```typescript
describe("Security", () => {
  it("should reject malicious API keys", () => {
    const malicious = '"""; import os; os.system("id"); print("""';
    expect(isValidApiKeyFormat(malicious)).toBe(false);
  });

  it("should escape Python strings", () => {
    const input = 'test"; os.system("id"); print("';
    const escaped = escapePythonString(input);
    expect(escaped).not.toContain('"); os.system(');
  });
});
```

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers
3. Provide details: steps to reproduce, impact, suggested fix
4. Allow time for a fix before public disclosure

## Security Updates

### 2025-01-08
- Fixed critical code injection vulnerabilities in API key handling
- Fixed configuration injection in code generation
- Improved job ID generation with cryptographic UUIDs
- Added comprehensive input validation
- Created centralized security utility library

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE-94: Code Injection](https://cwe.mitre.org/data/definitions/94.html)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [Python Security Best Practices](https://python.readthedocs.io/en/stable/library/security_warnings.html)
