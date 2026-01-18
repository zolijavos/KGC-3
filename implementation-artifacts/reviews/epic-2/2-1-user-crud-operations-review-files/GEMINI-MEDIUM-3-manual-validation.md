# Hiba: Manuális validációs függvények használata a `ValidationPipe` helyett

**Fájl:** `packages/core/users/src/users.controller.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `UsersController` minden egyes endpoint metódusában manuálisan hívja meg a DTO-khoz tartozó validációs függvényeket (pl. `validateCreateUserInput`, `validateUpdateUserInput`). Ez a megközelítés több szempontból is elmarad a NestJS által javasolt gyakorlattól.

1.  **Bőbeszédűség:** Minden metódus elején ismétlődő kód (`if (!validation.success) { ... }`) található a validáció elvégzésére és a `400 Bad Request` válasz összeállítására.
2.  **Deklaratív megközelítés hiánya:** A NestJS a deklaratív programozást részesíti előnyben. A `ValidationPipe` használatával a validáció egy "cross-cutting concern"-ként kezelhető, és a kontroller logikája tisztán az üzleti folyamatokra koncentrálhat.
3.  **Integráció hiánya:** A beépített `ValidationPipe` zökkenőmentesen működik együtt a DTO class-okkal és a `class-validator` csomaggal. Bár a projekt `zod`-ot használ, léteznek megoldások (pl. egyedi pipe, `nestjs-zod` csomag) a `zod` sémák és a NestJS pipe-rendszerének integrálására.

## Bizonyíték

```typescript
// packages/core/users/src/users.controller.ts

@Post()
async createUser(
  @Body() body: unknown, // A body típusa `unknown`
  // ...
): Promise<Response> {
  // Manuális validáció
  const validation = validateCreateUserInput(body);
  if (!validation.success) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      error: validation.error,
    });
  }
  // ...
}

@Patch(':id')
async updateUser(
  // ...
  @Body() body: unknown, // A body típusa `unknown`
  // ...
): Promise<Response> {
  // Manuális validáció
  const validation = validateUpdateUserInput(body);
  if (!validation.success) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      error: validation.error,
    });
  }
  // ...
}
```

## Megoldás

Alkalmazza a NestJS beépített `ValidationPipe`-ját (vagy egy egyedi, `zod`-alapú implementációt) a validáció automatizálására. Ez a DTO-kat "first-class citizen"-né teszi a NestJS-ben.

**A megoldás lépései:**

**1. `zod` és a NestJS pipe-ok integrálása:**
Hozzon létre egy egyedi `ZodValidationPipe`-ot, ami a `zod` sémákat használja a validációhoz.

```typescript
// packages/core/users/src/pipes/zod-validation.pipe.ts
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      // A Zod hibát átalakítjuk NestJS-kompatibilis formátumra
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: error.errors, // Zod hibaobjektum
      });
    }
  }
}
```

**2. A `ValidationPipe` alkalmazása a kontrollerben:**
Használja a `@Body` és `@Query` dekorátorokban az új pipe-ot a DTO class-okkal együtt.

```typescript
// packages/core/users/src/users.controller.ts
import { Body, Post, UsePipes } from '@nestjs/common';
import { createUserSchema, CreateUserDto } from './dto/create-user.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

// ...

@Controller('api/v1/users')
export class UsersController {
  // ...
  @Post()
  // A `UsePipes` dekorátorral is megadható, vagy globálisan
  async createUser(
    @Body(new ZodValidationPipe(createUserSchema)) createUserDto: CreateUserDto,
    @Req() req: AuthenticatedRequest
  ) {
    // A `createUserDto` itt már validált és típusos.
    // Nincs szükség a manuális validációs blokkra.
    
    const user = await this.usersService.createUser(
      {...createUserDto, tenantId: req.user.tenantId },
      // ...
    );
    return { data: user };
  }
}
```

Ez a megközelítés a kontrollert sokkal tisztábbá, deklaratívabbá és a NestJS konvencióinak megfelelővé teszi. A validációs logika elkülönül az üzleti logikától, ami javítja a kód szervezettségét és karbantarthatóságát.
