/**
 * KGC ERP API - Main Entry Point
 * NestJS application bootstrap with SPA frontend support
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // dist/src/main.js -> dist -> apps/kgc-api -> public
  const publicPath = join(__dirname, '..', '..', 'public');

  // Serve static files from public folder
  app.useStaticAssets(publicPath);

  // Global prefix for API routes only
  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  // Enable CORS for development
  app.enableCors({
    origin: process.env['CORS_ORIGINS']?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost:3010',
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('KGC ERP API')
    .setDescription('Kisgépcentrum ERP rendszer API dokumentáció - v7.0')
    .setVersion('7.0.0')
    .addBearerAuth()
    // Core
    .addTag('auth', 'Authentikáció és JWT kezelés')
    .addTag('users', 'Felhasználó kezelés')
    .addTag('tenants', 'Tenant (franchise) kezelés')
    // Értékesítés
    .addTag('pos', 'Pénztár (Point of Sale) - Epic 22')
    .addTag('invoice', 'Számlázás')
    .addTag('quote', 'Árajánlatok')
    // Bérlés
    .addTag('bergep', 'Bérgép kezelés')
    .addTag('rental-vehicles', 'Bérautó kezelés')
    // Szerviz
    .addTag('bergep-szerviz', 'Szerviz munkalapok')
    .addTag('service-norma', 'Szerviz normák (Makita)')
    // Készlet
    .addTag('inventory', 'Készletkezelés')
    .addTag('bevetelezes', 'Árubevételezés - Epic 21')
    .addTag('stock-count', 'Leltár')
    // Integráció
    .addTag('twenty-crm', 'Twenty CRM integráció')
    .addTag('online-booking', 'Online foglalás')
    // Riportok
    .addTag('reports', 'Riportok és dashboard')
    .addTag('vehicles', 'Járművek kezelés')
    .addTag('tasks', 'Feladatkezelés')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // SPA fallback - serve index.html for all non-API/non-static routes
  // This must be after all other routes are registered
  app.use(
    (
      req: { path: string; method: string },
      res: { sendFile: (path: string) => void },
      next: () => void
    ) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }

      // Skip static files (check if file exists)
      const staticPath = join(publicPath, req.path);
      if (existsSync(staticPath) && !req.path.endsWith('/')) {
        return next();
      }

      // Serve index.html for SPA routing
      const indexPath = join(publicPath, 'index.html');
      if (existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }

      // Fallback to next middleware if no index.html
      next();
    }
  );

  // Start server
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  logger.log(`KGC ERP API running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`Frontend app: http://localhost:${port}/`);
}

bootstrap();
