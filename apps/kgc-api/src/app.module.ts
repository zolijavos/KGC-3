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
  controllers: [AppController, MockAuthController],
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
