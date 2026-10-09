import { OutboxEventModel } from "../models/OutboxEvent.js";
import { emailService } from "../services/emailService.js";
import { logger } from "../config/logger.js";

export class EmailWorker {
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number = 3000;
  private readonly maxAttempts: number = 5;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info("[Outbox Worker] Email outbox worker started.");
    this.poll();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info("[Outbox Worker] Email outbox worker stopped.");
  }

  private poll(): void {
    if (!this.isRunning) return;

    this.processPendingEvents()
      .catch((err) => {
        logger.error("[Outbox Worker] Error processing events:", {
          error: err,
        });
      })
      .finally(() => {
        if (this.isRunning) {
          this.timer = setTimeout(() => this.poll(), this.pollIntervalMs);
        }
      });
  }

  async processPendingEvents(): Promise<number> {
    const now = new Date();
    // Fetch pending or failed events ready for retry
    const events = await OutboxEventModel.find({
      status: { $in: ["PENDING", "PROCESSING"] },
      nextAttemptAt: { $lte: now },
      attempts: { $lt: this.maxAttempts },
    })
      .sort({ createdAt: 1 })
      .limit(10);

    for (const event of events) {
      try {
        event.status = "PROCESSING";
        event.attempts += 1;
        await event.save();

        const payload = event.payload;

        switch (event.eventType) {
          case "VERIFICATION_EMAIL":
            await emailService.sendVerificationEmail(
              payload.email,
              payload.token,
            );
            break;

          case "PASSWORD_RESET":
            await emailService.sendPasswordResetEmail(
              payload.email,
              payload.token,
            );
            break;

          case "INVITATION_SENT":
            await emailService.sendInvitationEmail(
              payload.email,
              payload.token,
              payload.projectName,
              payload.role,
              payload.inviterName,
            );
            break;

          case "ROLE_CHANGED":
            await emailService.sendRoleChangedEmail(
              payload.email,
              payload.projectName,
              payload.newRole,
              payload.actorName,
            );
            break;

          default:
            logger.warn(
              `[Outbox Worker] Unknown eventType: ${event.eventType}`,
              { eventId: event._id },
            );
            break;
        }

        event.status = "COMPLETED";
        event.processedAt = new Date();
        await event.save();
        logger.debug(
          `[Outbox Worker] Event ${event._id} (${event.eventType}) processed successfully.`,
        );
      } catch (err: any) {
        logger.error(`[Outbox Worker] Failed to process event ${event._id}`, {
          eventType: event.eventType,
          attempt: event.attempts,
          error: err?.message,
        });
        const backoffSeconds = Math.pow(2, event.attempts) * 5; // 10s, 20s, 40s...
        event.nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);
        event.lastError = err?.message || String(err);
        if (event.attempts >= this.maxAttempts) {
          event.status = "FAILED";
          logger.warn(
            `[Outbox Worker] Event ${event._id} permanently failed after ${event.attempts} attempts.`,
          );
        } else {
          event.status = "PENDING";
        }
        await event.save();
      }
    }

    return events.length;
  }
}

export const emailWorker = new EmailWorker();
