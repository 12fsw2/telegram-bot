import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { BotUpdate } from './bot.update';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  public bot: Telegraf;

  constructor(private readonly botUpdate: BotUpdate) {
    this.bot = new Telegraf(process.env.BOT_TOKEN!);
  }

 async onModuleInit() {
  this.botUpdate.register(this.bot);

  process.once('SIGINT', () => this.bot.stop('SIGINT'));
  process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

  // launch() ni background da ishlatish
  this.bot.launch().catch((err) => this.logger.error('Bot xatosi:', err));
  
  this.logger.log('🤖 Matematik bot ishga tushdi!');
}
}