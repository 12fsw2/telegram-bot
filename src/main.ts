import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Webhook endpoint
  app.use('/webhook', (req, res, next) => {
    const botService = app.get(BotService);
    botService.bot.handleUpdate(req.body, res);
  });

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, '0.0.0.0');

  logger.log(`🤖 FastFood Bot ishga tushdi! Port: ${PORT}`);
}

bootstrap();