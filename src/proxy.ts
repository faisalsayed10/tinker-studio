import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Rate Limiter: In-memory rate limiting
 * Tracks requests per identifier (IP address or API key)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter((time) => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Create rate limiters for different endpoints
const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
const trainingRateLimiter = new RateLimiter(10, 60000); // 10 training jobs per minute
const validationRateLimiter = new RateLimiter(20, 60000); // 20 validations per minute

// Cleanup old entries every 5 minutes
setInterval(() => {
  apiRateLimiter.cleanup();
  trainingRateLimiter.cleanup();
  validationRateLimiter.cleanup();
}, 300000);

export function proxy(request: NextRequest) {
  // Get identifier (prefer API key from header, fallback to IP)
  const apiKey = request.headers.get("x-api-key") || request.headers.get("x-tinker-api-key");
  const ip =
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const identifier = apiKey ? `api:${apiKey}` : `ip:${ip}`;

  // Apply different rate limits based on path
  const path = request.nextUrl.pathname;

  let limiter = apiRateLimiter;
  if (path.startsWith("/api/training/start")) {
    limiter = trainingRateLimiter;
  } else if (path.startsWith("/api/tinker/validate")) {
    limiter = validationRateLimiter;
  }

  // Check rate limit
  if (!limiter.checkLimit(identifier)) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      },
      { status: 429 }
    );
  }

  // Continue to the route
  return NextResponse.next();
}

// Configure which routes use middleware
export const config = {
  matcher: ["/api/tinker/:path*", "/api/training/:path*", "/api/checkpoints/:path*"],
};
