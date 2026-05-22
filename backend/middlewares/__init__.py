"""
NELVYON Backend Middlewares.

Middleware execution order (outermost to innermost):
1. CORSMiddleware — handles preflight OPTIONS, adds CORS headers
2. RequestIDMiddleware — assigns X-Request-ID, resolves Accept-Language (i18n)
3. RateLimiterMiddleware — sliding-window rate limiting per IP/category
4. SecurityMiddleware — security headers, input sanitization, body scanning
5. ErrorHandlerMiddleware — catches unhandled exceptions, structured error responses

I18nMiddleware (core.i18n) language binding runs inside RequestIDMiddleware when
main.py is not modified; use register_i18n_middleware(app) for explicit registration.
"""