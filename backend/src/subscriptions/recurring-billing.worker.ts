import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class RecurringBillingWorker implements OnModuleInit {
  private readonly logger = new Logger(RecurringBillingWorker.name);
  private intervalRef: NodeJS.Timeout | null = null;

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  onModuleInit() {
    this.logger.log('[RECURRING BILLING WORKER] Initialized background worker service for BullMQ / recurring billing execution.');
    
    // Periodically run background recurring billing check every 12 hours
    this.intervalRef = setInterval(
      async () => {
        try {
          this.logger.log('[RECURRING BILLING WORKER] Triggering scheduled background recurring billing check...');
          await this.subscriptionsService.generateRecurringInvoices();
        } catch (err: any) {
          this.logger.error(`[RECURRING BILLING WORKER] Error in recurring billing execution: ${err.message}`, err.stack);
        }
      },
      12 * 60 * 60 * 1000,
    );
  }
}
