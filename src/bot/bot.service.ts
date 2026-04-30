import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { BotUpdate } from './bot.update';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  public bot: Telegraf;

  constructor(private readonly botUpdate: BotUpdate) {
    const token = process.env.BOT_TOKEN;

    if (!token) {
      throw new Error('BOT_TOKEN topilmadi');
    }

    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    this.botUpdate.register(this.bot);

    // Webhook o'rnatish
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      await this.bot.telegram.setWebhook(`${webhookUrl}/webhook`);
      this.logger.log(`✅ Webhook o'rnatildi: ${webhookUrl}/webhook`);
    }

    this.logger.log('🤖 FastFood Bot ishga tushdi!');

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}