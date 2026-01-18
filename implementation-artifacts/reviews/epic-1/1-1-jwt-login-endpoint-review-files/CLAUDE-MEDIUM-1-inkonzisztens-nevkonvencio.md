# Hiba: Inkonzisztens Névkonvenció a `schema.prisma`-ban

**Fájl:** `packages/core/auth/prisma/schema.prisma`
**Súlyosság:** KÖZEPES

## Probléma

A `User` modellben a `deletedEmail` mező camelCase-t használ, míg más mezők, mint a `password_hash` és a `tenant_id`, snake_case-t. A konvenciónak egységesnek kellene lennie.

## Bizonyíték

```prisma
// schema.prisma
model User {
  passwordHash String     @map("password_hash")
  deletedEmail String?    @map("deleted_email")
}
```

## Megoldás

Válasszon egy konvenciót (javasolt a `@@map` miatt a snake_case) és alkalmazza mindenhol. `deletedEmail` -> `deleted_email`.
