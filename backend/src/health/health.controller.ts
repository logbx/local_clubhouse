import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      async () => this.mongoose.pingCheck('mongodb'),
    ]);
  }

  // Enhanced health endpoint with detailed system information
  @Get('detailed')
  async detailedCheck() {
    const healthData = await this.health.check([
      async () => this.mongoose.pingCheck('mongodb'),
    ]);

    // Add system metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      ...healthData,
      system: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        uptimeSeconds: uptime,
        memory: {
          used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        },
        nodeVersion: process.version,
        environment: this.configService.get('NODE_ENV', 'development'),
        pid: process.pid,
      }
    };
  }

  // Simple health check for monitoring systems
  @Get('status')
  async simpleStatus() {
    try {
      await this.health.check([
        async () => this.mongoose.pingCheck('mongodb'),
      ]);
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (error: any) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
} 