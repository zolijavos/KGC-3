/**
 * KGC ERP API - Application Module
 * Root module that imports all feature modules
 */

import { Body, Controller, Get, Logger, Module, OnModuleInit, Post } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';

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

    // Process webhook based on event type
    switch (body.event) {
      case 'person.created':
      case 'person.updated':
        this.logger.log(`Person event: ${JSON.stringify(body.data)}`);
        // TODO: Sync to KGC Partner
        break;
      case 'company.created':
      case 'company.updated':
        this.logger.log(`Company event: ${JSON.stringify(body.data)}`);
        // TODO: Sync to KGC Partner
        break;
      case 'opportunity.created':
      case 'opportunity.updated':
        this.logger.log(`Opportunity event: ${JSON.stringify(body.data)}`);
        // TODO: Handle deal/opportunity
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

// Mock Auth Controller (temporary - until packages are fixed)
@ApiTags('auth')
@Controller('auth')
class MockAuthController {
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'admin@kgc.hu' },
        password: { type: 'string', example: 'admin123' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() body: { email: string; password: string }) {
    // Mock login - accept admin@kgc.hu / admin123
    if (body.email === 'admin@kgc.hu' && body.password === 'admin123') {
      return {
        accessToken: 'mock-jwt-token-for-testing-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        user: {
          id: '1',
          email: 'admin@kgc.hu',
          name: 'Admin User',
          role: 'ADMIN',
        },
      };
    }
    return { statusCode: 401, message: 'Invalid credentials' };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout current user' })
  logout() {
    return { message: 'Logged out successfully' };
  }
}

// Create singleton PrismaClient
const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

@Module({
  imports: [
    // Configuration module - load .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [AppController, WebhookController, MockAuthController],
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
      // Don't throw - allow app to start without DB for basic testing
      this.logger.warn('App starting without database connection');
    }
  }
}
