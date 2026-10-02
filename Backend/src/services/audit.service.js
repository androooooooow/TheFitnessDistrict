import { randomUUID } from 'node:crypto';
export function auditService(models) {
  return (actor, action, entityType, entityId, details, transaction) =>
    models.Audit.create(
      {
        id: randomUUID(),
        actorId: actor.id,
        actorRole: actor.role,
        action,
        entityType,
        entityId,
        details: details || {},
        occurredAt: new Date(),
      },
      { transaction },
    );
}
