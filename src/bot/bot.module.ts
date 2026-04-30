// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { BotService } from './bot.service';
// import { BotUpdate } from './bot.update';
// import { MathService } from '../math/math.service';
// import { SessionService } from '../session/session.service';
// import { User, UserSchema } from '../schemas/user.schema';

// @Module({
//   imports: [
//     MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
//   ],
//   providers: [BotService, BotUpdate, MathService, SessionService],
//   exports: [BotService],
// })
// export class BotModule {}



import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegrafModule } from 'nestjs-telegraf';

import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { MathService } from '../math/math.service';
import { SessionService } from '../session/session.service';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN as string,
      launchOptions: {
        webhook: {
          domain: 'https://telegram-bot-gbvr.onrender.com',
          hookPath: '/webhook',
        },
      },
    }),
  ],
  providers: [BotService, BotUpdate, MathService, SessionService],
  exports: [BotService],
})
export class BotModule {}