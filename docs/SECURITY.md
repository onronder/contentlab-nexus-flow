# Security Guidelines

## Environment Variables & Secrets Management

### Public vs Private Variables

#### Public Variables (Safe for Client Bundle)
- All variables prefixed with `VITE_` are public and included in the client bundle
- These can be safely committed to version control
- Examples: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

#### Private Secrets (Never in Frontend)
- API keys, service account keys, database passwords
- These should NEVER be stored in frontend code or environment variables
- Use Supabase Edge Functions with the secrets feature for server-side operations

### Best Practices

1. **Environment Files**
   - `.env` files are ignored by git and should not be committed
   - Use `.env.example` as a template with placeholder values
   - All environment variables in this project are currently public/publishable

2. **Supabase Secrets Management**
   - For private API integrations, use Supabase Edge Functions
   - Store secrets using the Supabase secrets feature
   - Access secrets only in server-side edge functions
   - Example: Stripe API keys, SendGrid keys, external service credentials

3. **Frontend Secret Handling**
   - If users need to input private keys (not recommended), use localStorage
   - Implement client-side encryption for sensitive data
   - Always prefer server-side processing for sensitive operations

## Current Security Status

✅ **Secure Practices Implemented:**
- All environment variables are public/publishable
- Supabase Row Level Security (RLS) enabled
- Authentication handled by Supabase Auth
- Database access controlled by RLS policies

⚠️ **Security Considerations:**
- `.env` file tracking has been disabled
- Private secrets should use Supabase Edge Functions
- CSP headers implemented for additional protection

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of using the public issue tracker.