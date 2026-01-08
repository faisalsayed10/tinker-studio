/**
 * Security Utilities
 * Provides input validation and sanitization functions to prevent injection attacks
 */

/**
 * Validates API key format to prevent injection attacks
 * API keys should only contain alphanumeric characters, hyphens, underscores, and dots
 *
 * @param apiKey - The API key to validate
 * @returns true if valid, false otherwise
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // API keys should be reasonable length and contain safe characters
  if (apiKey.length < 20 || apiKey.length > 200) {
    return false;
  }
  // Only allow alphanumeric, hyphens, underscores, and dots
  return /^[a-zA-Z0-9_\-\.]+$/.test(apiKey);
}

/**
 * Validates that a string only contains safe characters for identifiers
 * Allows: alphanumeric, hyphens, underscores, forward slashes, and dots
 *
 * @param str - The string to validate
 * @param fieldName - Name of the field for error messages
 * @throws Error if validation fails
 */
export function validateSafeIdentifier(str: string, fieldName: string): void {
  if (!/^[a-zA-Z0-9_\-\/\.]+$/.test(str)) {
    throw new Error(
      `${fieldName} contains invalid characters. Only alphanumeric, hyphens, underscores, slashes, and dots are allowed.`
    );
  }
  if (str.length > 200) {
    throw new Error(`${fieldName} is too long (max 200 characters)`);
  }
}

/**
 * Escapes a string for safe inclusion in Python string literals
 * Prevents code injection by escaping special characters
 *
 * @param str - The string to escape
 * @returns Escaped string safe for Python code
 */
export function escapePythonString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")  // Backslash must be first
    .replace(/"/g, '\\"')     // Escape double quotes
    .replace(/'/g, "\\'")     // Escape single quotes
    .replace(/\n/g, "\\n")    // Escape newlines
    .replace(/\r/g, "\\r")    // Escape carriage returns
    .replace(/\t/g, "\\t");   // Escape tabs
}

/**
 * Validates a job ID format
 * Job IDs should be UUIDs prefixed with "job_"
 *
 * @param jobId - The job ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidJobId(jobId: string): boolean {
  // Format: job_[uuid]
  return /^job_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(jobId);
}

/**
 * Rate limiting: Simple in-memory rate limiter
 * In production, use Redis or a dedicated rate limiting service
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  /**
   * Create a rate limiter
   * @param maxRequests - Maximum number of requests allowed in the time window
   * @param windowMs - Time window in milliseconds
   */
  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier for the client (IP, API key, etc.)
   * @returns true if request should be allowed, false if rate limited
   */
  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Remove requests outside the time window
    const validRequests = requests.filter(time => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  /**
   * Clean up old entries to prevent memory leaks
   * Should be called periodically
   */
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

/**
 * Sanitizes error messages to prevent information disclosure
 * Removes sensitive paths and system information
 *
 * @param error - The error message to sanitize
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(error: string): string {
  return error
    .replace(/\/home\/[^\/]+/g, "/home/user")
    .replace(/\/tmp\/[^\/\s]+/g, "/tmp/***")
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "***.***.***.**")
    .replace(/:[0-9]+/g, ":****");
}
