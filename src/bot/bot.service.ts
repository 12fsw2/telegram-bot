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

    try {
      await this.bot.launch();
      this.logger.log('🤖 Matematik bot ishga tushdi!');
    } catch (err) {
      this.logger.error('Bot launch xatosi:', err);
    }

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}