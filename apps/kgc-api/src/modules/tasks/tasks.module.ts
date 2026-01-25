/**
 * Tasks Module - NestJS Module for Task Management
 * Epic 12: Feladatlista Widget
 * ADR-040: Feladatlista Widget Architektúra
 *
 * Provides:
 * - Shopping list items (bevásárlólista) - Story 12-1
 * - To-do tasks with assignees - Story 12-2
 * - Task status and completion - Story 12-3
 * - Personal notes (private) - Story 12-4
 * - Manager list access - Story 12-5
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Repository
import { PrismaTaskRepository } from './repositories/prisma-task.repository';

// Controller
import { TaskController } from './controllers/task.controller';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TasksModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class TasksModule {
  static forRoot(options: TasksModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repository
      {
        provide: TASK_REPOSITORY,
        useClass: PrismaTaskRepository,
      },
      PrismaTaskRepository,
    ];

    return {
      module: TasksModule,
      controllers: [TaskController],
      providers,
      exports: [TASK_REPOSITORY, PrismaTaskRepository],
    };
  }
}
