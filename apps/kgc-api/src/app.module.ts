/**
 * KGC ERP API - Application Module
 * Root module that imports all feature modules
 *
 * Circular dependency between @kgc/auth and @kgc/users has been FIXED:
 * - Guards and interfaces moved to @kgc/common
 * - Both modules now depend on @kgc/common instead of each other
 *
 * AuthModule is now fully functional with Swagger decorators.
 */

import { AuthModule } from '@kgc/auth';
import { Body, Controller, Get, Logger, Module, OnModuleInit, Post } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PartnersModule } from './modules/partners/partners.module';
import { ProductsModule } from './modules/products/products.module';
import { RentalModule } from './modules/rental/rental.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

// Create singleton PrismaClient
const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Health check controller
@Controller()
class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'kgc-api',
      version: '3.0.0',
    };
  }

  @Get()
  root() {
    return {
      name: 'KGC ERP API',
      version: '3.0.0',
      docs: '/api/docs',
    };
  }
}

// Twenty CRM Webhook Controller
@ApiTags('webhooks')
@Controller('webhooks')
class WebhookController {
  private readonly logger = new Logger('WebhookController');

  @Post('twenty')
  @ApiOperation({ summary: 'Receive Twenty CRM webhook events' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        event: { type: 'string', example: 'person.created' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async handleTwentyWebhook(@Body() body: { event: string; data: Record<string, unknown> }) {
    this.logger.log(`Twenty webhook received: ${body.event}`);

    switch (body.event) {
      case 'person.created':
      case 'person.updated':
        this.logger.log(`Person event: ${JSON.stringify(body.data)}`);
        break;
      case 'company.created':
      case 'company.updated':
        this.logger.log(`Company event: ${JSON.stringify(body.data)}`);
        break;
      case 'opportunity.created':
      case 'opportunity.updated':
        this.logger.log(`Opportunity event: ${JSON.stringify(body.data)}`);
        break;
      default:
        this.logger.log(`Unhandled event type: ${body.event}`);
    }

    return { received: true, event: body.event, timestamp: new Date().toISOString() };
  }

  @Get('twenty/health')
  @ApiOperation({ summary: 'Webhook endpoint health check' })
  webhookHealth() {
    return { status: 'ok', endpoint: 'twenty-webhook' };
  }
}

@Module({
  imports: [
    // Configuration module - load .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // AuthModule with Prisma client and app base URL
    AuthModule.forRoot({
      prisma,
      appBaseUrl: process.env['APP_BASE_URL'] ?? 'http://localhost:3010',
    }),

    // InventoryModule - Készlet nyilvántartás (Story 9-1)
    InventoryModule.forRoot({ prisma }),

    // PartnersModule - Partner kezelés (Epic 7)
    PartnersModule.forRoot({ prisma }),

    // ProductsModule - Termék katalógus (Epic 8)
    ProductsModule.forRoot({ prisma }),

    // RentalModule - Bérlés, Kaució, Szerződés (Epic 14-16)
    RentalModule.forRoot({ prisma }),

    // VehiclesModule - Járműnyilvántartás (Epic 34, ADR-027)
    VehiclesModule.forRoot({ prisma }),
  ],
  controllers: [AppController, WebhookController],
  providers: [
    {
      provide: 'PRISMA_CLIENT',
      useValue: prisma,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  async onModuleInit() {
    // Test database connection on startup
    try {
      await prisma.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      this.logger.warn('App starting without database connection');
    }
  }
}
