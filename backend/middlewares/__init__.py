"""
NELVYON Backend Middlewares.

Middleware execution order (outermost to innermost):
1. CORSMiddleware — handles preflight OPTIONS, adds CORS headers
2. RequestIDMiddleware — assigns X-Request-ID for traceability
3. RateLimiterMiddleware — sliding-window rate limiting per IP/category
4. SecurityMiddleware — security headers, input sanitization, body scanning
5. ErrorHandlerMiddleware — catches unhandled exceptions, structured error responses
"""