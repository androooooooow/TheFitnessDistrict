# Backend folder architecture — Node.js / Express / PostgreSQL

Use layered routes, controllers, services, models, and middleware. The tree below is the proposed implementation layout; only documentation exists at this stage. Sequelize provides the ORM/data model and versioned migrations. Keep application modules in one backend deployment.

```text
Backend/
  ARCHITECTURE.md
  package.json
  .env.example
  src/
    app.js                       # Express app and middleware order
    server.js                    # Startup, HTTP listener, graceful shutdown
    config/
      env.js                     # Validate configuration at startup
      database.js                # PostgreSQL / Sequelize connection
      google.js                  # OAuth client and exact callback config
      mail.js                    # Email transport config
      security.js                # Cookie, JWT, CSP, limiter policies
    routes/
      index.js                   # Mount under /api/v1
      auth.routes.js
      user.routes.js             # Admin account management
      member.routes.js           # Admin member management
      me.routes.js               # User's own records
      plan.routes.js
      access.routes.js
      attendance.routes.js
      progress.routes.js
      goal.routes.js
      report.routes.js
    controllers/
      auth.controller.js
      user.controller.js
      member.controller.js
      me.controller.js
      plan.controller.js
      access.controller.js
      attendance.controller.js
      progress.controller.js
      goal.controller.js
      report.controller.js
    services/
      auth.service.js            # Registration/login/session rules
      googleAuth.service.js      # OAuth state, token verification, linking
      emailVerification.service.js
      user.service.js
      member.service.js
      plan.service.js
      access.service.js          # Activation/renewal/status/allowances
      attendance.service.js      # Atomic visit + session deduction
      progress.service.js
      goal.service.js
      report.service.js
      audit.service.js
      mail.service.js            # Provider adapter; no business permissions
    models/
      index.js                   # Register associations
      user.model.js
      oauthIdentity.model.js
      emailVerificationChallenge.model.js
      authSession.model.js
      refreshToken.model.js
      oauthTransaction.model.js
      accountInvitation.model.js
      authRateCounter.model.js
      member.model.js
      plan.model.js
      accessGrant.model.js
      attendance.model.js
      sessionLedger.model.js
      progressAssessment.model.js
      progressEntry.model.js
      exercise.model.js
      memberGoal.model.js
      auditEvent.model.js
    middleware/
      requestId.js
      authenticate.js            # JWT + session + account state
      requireRole.js             # Only admin/user
      ownership.js               # Linked member and entry-author checks
      validate.js
      csrf.js
      rateLimit.js
      notFound.js
      errorHandler.js
    validators/
      auth.schema.js
      user.schema.js
      member.schema.js
      plan.schema.js
      access.schema.js
      attendance.schema.js
      progress.schema.js
      goal.schema.js
      report.schema.js
    utils/
      password.js                # Argon2id hashing/verification
      tokens.js                  # JWT and secure random token helpers
      verificationCode.js        # Secure code generation and keyed HMAC
      encryption.js              # Authenticated field encryption
      AppError.js
      logger.js                  # Redaction and request IDs
    jobs/
      cleanupAuth.js             # Expired auth/challenge records
      reviewAttendance.js        # Flag unresolved visits
    templates/
      verificationEmail.js
  migrations/                    # Versioned schema/index/constraint changes
  seeders/                       # Development/test sample data
  scripts/
    bootstrapAdmin.js            # Controlled initial admin; no fixed password
  tests/
    unit/
    integration/                 # Real dedicated PostgreSQL test database
    security/
  postman/
    gym-api.collection.json      # Flows + attack/permission assertions
    local.environment.example.json
  security/
    zap-plan.yaml                # Test/staging scan configuration
```

This design uses JavaScript modules; configure the migration runner to match the chosen module format. Dependency versions and exact runner commands should be pinned and verified when creating the implementation.

## Responsibilities and dependency direction

| Layer | Responsibility |
| --- | --- |
| Routes | Declare method/path and attach limiter, authentication, role, ownership, and validation middleware |
| Controllers | Read validated request/context, call services, and return HTTP responses |
| Services | Implement business decisions and own transaction boundaries across models |
| Models | Define tables/associations and perform database operations with the provided transaction |
| Middleware | Handle shared HTTP/auth/security concerns |
| Validators | Define allowed fields, types, lengths, IDs, ranges, and date rules |
| Migrations | Create/change schema and database-enforced constraints |
| Utilities/adapters | Provide reusable cryptography, logging, and mail/provider functions |
| Tests/configs | Verify domain/security behavior and API scans |

The usual dependency direction is `routes -> middleware -> controllers -> services -> models -> PostgreSQL`. Services never depend on Express request/response objects. Controllers do not perform direct database writes or decide whether a membership is valid. Models do not send email or choose a user's permissions.

For a check-in, `attendance.service` starts the transaction, locks the member then access record, validates admission, writes attendance/session ledger/audit, and commits. Pass the same transaction to every participating model. An email verification service similarly consumes the challenge and marks verification/links the member atomically; send email outside a database transaction.

Application configuration is validated on startup. The app refuses to start with missing signing/encryption/code-HMAC keys or invalid production cookie/origin settings. Keep `.env` files out of version control. Add no payment module or trainer/front-desk roles.

## Frontend contract

React calls `/api/v1` using cookies and the CSRF header, handles one refresh at a time, and displays safe API errors. Suggested frontend areas: `pages/auth`, `pages/admin`, `pages/user`, `components`, `api`, and `hooks`. Client route guards improve navigation; all permissions still run on the backend.

See [main architecture](../ARCHITECTURE.md) for the data model and [security specification](../SECURITY.md) for authentication, encryption, rate-limit policies, and test requirements.
