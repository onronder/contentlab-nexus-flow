# Production Operations Runbook

## 🚀 Production Deployment & Operations Guide

**Last Updated**: 2025-08-20  
**System Status**: 95% Production Ready  
**Target Environment**: Enterprise Production

---

## 📋 Pre-Deployment Checklist

### Environment Verification
- [ ] Node.js 18+ installed and configured
- [ ] GitHub repository connected and CI/CD pipeline active
- [ ] Domain name configured (if using custom domain)
- [ ] SSL certificates validated
- [ ] CDN configuration optimized

### Database & Security
- [ ] Supabase production environment configured
- [ ] RLS policies tested and validated
- [ ] Database security linter warnings resolved (4 remaining)
- [ ] Edge functions deployed and tested
- [ ] API rate limiting configured

### Performance & Monitoring
- [ ] Core Web Vitals monitoring active
- [ ] Error tracking and alerting configured
- [ ] Performance thresholds set and tested
- [ ] Real-time monitoring dashboard operational
- [ ] Backup and recovery procedures validated

---

## 🔧 Deployment Procedures

### 1. Production Build Process
```bash
# Clean and prepare environment
npm ci --production
npm run lint
npm run build

# Verify build integrity
npm run preview
```

### 2. Environment Configuration
```bash
# Required environment variables
NODE_ENV=production
VITE_SUPABASE_URL=https://ijvhqqdfthchtittyvnt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional performance settings
VITE_ENABLE_ANALYTICS=true
VITE_PERFORMANCE_MONITORING=true
```

### 3. Deployment Options

#### Option A: Vercel (Recommended)
```bash
# Install and deploy
npm i -g vercel
vercel --prod

# Configure custom domain
vercel domains add yourdomain.com
vercel alias yourdomain.com
```

#### Option B: Netlify
```bash
# Install and deploy
npm i -g netlify-cli
netlify build
netlify deploy --prod --dir=dist

# Configure redirects and headers
echo "/_headers" >> netlify.toml
```

#### Option C: Docker Container
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔍 Monitoring & Observability

### Real-Time Monitoring Dashboard
- **Performance Metrics**: Core Web Vitals, page load times, resource usage
- **Error Tracking**: Real-time error logging with stack traces and context
- **User Analytics**: Session recording, user flow tracking, engagement metrics
- **System Health**: Database performance, API response times, server resources

### Alert Configuration
```yaml
# Critical Alerts (Immediate Response)
- Error rate > 5%
- Page load time > 3 seconds
- Database connection failures
- API endpoint failures

# Warning Alerts (Monitor Closely)
- Memory usage > 80%
- Core Web Vitals degradation
- High user bounce rate
- Session recording failures
```

### Performance Thresholds
```javascript
// Core Web Vitals Targets
const performanceTargets = {
  LCP: 2.5, // Largest Contentful Paint (seconds)
  FID: 100,  // First Input Delay (milliseconds)
  CLS: 0.1,  // Cumulative Layout Shift
  TTFB: 600  // Time to First Byte (milliseconds)
};
```

---

## 🚨 Incident Response Procedures

### Severity Levels

#### P1 - Critical (< 15 minutes response)
- Complete service outage
- Data loss or corruption
- Security breach or vulnerability
- Payment processing failures

#### P2 - High (< 1 hour response)
- Partial service degradation
- Authentication issues
- Performance degradation > 50%
- Analytics tracking failures

#### P3 - Medium (< 4 hours response)
- Minor feature issues
- UI/UX problems
- Non-critical performance issues
- Documentation updates needed

#### P4 - Low (< 24 hours response)
- Enhancement requests
- Non-urgent optimizations
- Cosmetic issues
- Future planning items

### Emergency Contacts
```
- Engineering Lead: [Contact Info]
- DevOps Engineer: [Contact Info]
- Database Administrator: [Contact Info]
- Security Team: [Contact Info]
```

### Rollback Procedures
```bash
# Quick rollback to previous version
vercel rollback  # For Vercel deployments
# or
git revert HEAD~1 && git push origin main  # For Git-based deployments

# Database rollback (if needed)
supabase db reset  # Use with extreme caution
```

---

## 📊 Performance Optimization

### Current Optimizations Active
- ✅ **Bundle Optimization**: Tree shaking, code splitting, minification
- ✅ **Image Optimization**: WebP format, lazy loading, responsive images
- ✅ **Caching Strategy**: Intelligent service worker, browser caching
- ✅ **Database Optimization**: Indexed queries, connection pooling
- ✅ **CDN Configuration**: Static asset distribution, edge caching

### Monitoring Services Integration
```javascript
// Production monitoring services
const monitoringConfig = {
  errorTracking: 'Supabase Edge Functions',
  performanceMonitoring: 'Real-time Core Web Vitals',
  sessionRecording: 'Privacy-compliant user sessions',
  analytics: 'Custom analytics dashboard',
  uptime: 'Automated health checks'
};
```

---

## 🔐 Security Operations

### Security Headers (Required)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Database Security Checklist
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Database functions have proper search_path settings
- [ ] API access properly authenticated and authorized
- [ ] Sensitive data encrypted at rest and in transit
- [ ] Regular security audits and penetration testing

### Access Control
```sql
-- Regular security audit query
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 🔄 Maintenance Procedures

### Daily Operations
- [ ] Review error logs and performance metrics
- [ ] Check system health dashboard
- [ ] Validate backup integrity
- [ ] Monitor user feedback and support tickets

### Weekly Operations
- [ ] Security scan and vulnerability assessment
- [ ] Performance optimization review
- [ ] Database maintenance and cleanup
- [ ] Update dependencies and patches

### Monthly Operations
- [ ] Comprehensive security audit
- [ ] Performance benchmarking and load testing
- [ ] Disaster recovery testing
- [ ] Documentation updates and training

### Quarterly Operations
- [ ] Infrastructure cost optimization
- [ ] Technology stack updates and migrations
- [ ] Business continuity plan review
- [ ] Team training and knowledge sharing

---

## 📞 Support & Escalation

### Support Tiers
1. **Self-Service**: Documentation, FAQs, troubleshooting guides
2. **Technical Support**: Engineering team assistance
3. **Emergency Response**: 24/7 critical incident support
4. **Executive Escalation**: Business impact situations

### Communication Channels
- **Status Page**: Real-time system status and incident updates
- **Email Notifications**: Automated alerts and scheduled reports
- **Slack Integration**: Real-time team notifications
- **Dashboard Alerts**: In-application monitoring and alerts

---

## 📝 Documentation Links

- [Production Deployment Guide](./DEPLOYMENT.md)
- [Security Architecture](./SECURITY.md)
- [API Documentation](./API.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Performance Optimization](./PERFORMANCE.md)

---

**CRITICAL**: This runbook is a living document and should be updated with every significant deployment or infrastructure change. Regular reviews and team training are essential for effective incident response and system reliability.