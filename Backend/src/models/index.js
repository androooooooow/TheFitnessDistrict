import { DataTypes } from 'sequelize';
export function defineModels(db) {
  const common = { timestamps: false, freezeTableName: true };
  const User = db.define(
    'users',
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.TEXT, allowNull: false, field: 'password_hash' },
      role: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'user' },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      emailVerifiedAt: { type: DataTypes.DATE, allowNull: false, field: 'email_verified_at' },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    },
    common,
  );
  const Profile = db.define(
    'member_profiles',
    {
      userId: { type: DataTypes.UUID, primaryKey: true, field: 'user_id' },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      encryptedData: { type: DataTypes.TEXT, allowNull: false, field: 'encrypted_data' },
      requestedMembership: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'requested_membership',
      },
      rateCategory: { type: DataTypes.STRING(20), allowNull: false, field: 'rate_category' },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    common,
  );
  const Pending = db.define(
    'signup_challenges',
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      flowHash: { type: DataTypes.STRING(64), allowNull: false, field: 'flow_hash' },
      csrfHash: { type: DataTypes.STRING(64), allowNull: false, field: 'csrf_hash' },
      passwordHash: { type: DataTypes.TEXT, allowNull: false, field: 'password_hash' },
      encryptedData: { type: DataTypes.TEXT, allowNull: false, field: 'encrypted_data' },
      codeHash: { type: DataTypes.STRING(64), allowNull: false, field: 'code_hash' },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
      sentAt: { type: DataTypes.DATE, allowNull: false, field: 'sent_at' },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    },
    common,
  );
  const Session = db.define(
    'auth_sessions',
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
      csrfHash: { type: DataTypes.STRING(64), allowNull: false, field: 'csrf_hash' },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
      revokedAt: { type: DataTypes.DATE, field: 'revoked_at' },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    },
    common,
  );
  const Refresh = db.define(
    'refresh_tokens',
    {
      hash: { type: DataTypes.STRING(64), primaryKey: true },
      sessionId: { type: DataTypes.UUID, allowNull: false, field: 'session_id' },
      consumedAt: { type: DataTypes.DATE, field: 'consumed_at' },
    },
    common,
  );
  const Counter = db.define(
    'auth_counters',
    {
      key: { type: DataTypes.STRING(64), primaryKey: true },
      count: { type: DataTypes.INTEGER, allowNull: false },
      resetAt: { type: DataTypes.DATE, allowNull: false, field: 'reset_at' },
    },
    common,
  );
  const Audit = db.define(
    'audit_logs',
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      actorId: { type: DataTypes.UUID, field: 'actor_id' },
      actorRole: { type: DataTypes.TEXT, field: 'actor_role', allowNull: false },
      action: { type: DataTypes.TEXT, allowNull: false },
      entityType: { type: DataTypes.TEXT, field: 'entity_type', allowNull: false },
      entityId: { type: DataTypes.UUID, field: 'entity_id' },
      details: { type: DataTypes.JSONB, allowNull: false },
      occurredAt: { type: DataTypes.DATE, field: 'occurred_at', allowNull: false },
    },
    common,
  );
  const Progress = db.define(
    'progress_entries',
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      memberId: { type: DataTypes.UUID, field: 'member_id', allowNull: false },
      metric: { type: DataTypes.TEXT, allowNull: false },
      date: { type: DataTypes.DATEONLY, field: 'measured_on', allowNull: false },
      encryptedData: { type: DataTypes.TEXT, field: 'encrypted_data', allowNull: false },
      source: { type: DataTypes.TEXT, allowNull: false },
      createdBy: { type: DataTypes.UUID, field: 'created_by', allowNull: false },
      authorRole: { type: DataTypes.TEXT, field: 'author_role', allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      sortOrder: { type: DataTypes.BIGINT, field: 'sort_order', autoIncrement: true },
      createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false },
      updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
    },
    common,
  );
  const Goal = db.define(
    'member_goals',
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      memberId: { type: DataTypes.UUID, field: 'member_id', allowNull: false },
      metric: { type: DataTypes.TEXT, allowNull: false },
      encryptedData: { type: DataTypes.TEXT, field: 'encrypted_data', allowNull: false },
      updatedBy: { type: DataTypes.UUID, field: 'updated_by', allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false },
    },
    common,
  );
  return { User, Profile, Pending, Session, Refresh, Counter, Audit, Progress, Goal };
}
