/**
 * Tasks Module
 * Epic 12: Feladatlista Widget
 * ADR-040: Feladatlista Widget Architektúra
 *
 * Provides task/shopping list CRUD operations with Prisma persistence.
 */

import { Module } from '@nestjs/common';
import { PrismaTaskRepository } from './repositories/prisma-task.repository';

@Module({
  providers: [
    {
      provide: 'TASK_REPOSITORY',
      useClass: PrismaTaskRepository,
    },
    PrismaTaskRepository,
  ],
  exports: ['TASK_REPOSITORY', PrismaTaskRepository],
})
export class TasksModule {}
