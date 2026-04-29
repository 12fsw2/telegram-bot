import { Injectable, Logger } from '@nestjs/common';
import { Telegraf, Context, Markup } from 'telegraf';
import { MathService } from '../math/math.service';
import { SessionService } from '../session/session.service';

@Injectable()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(
    private readonly mathService: MathService,
    private readonly sessionService: SessionService,
  ) {}

  register(bot: Telegraf) {
    // ─── /start ───────────────────────────────────────────────
    bot.start(async (ctx) => {
      const name = ctx.from?.first_name ?? 'Do\'st';
      const userId = ctx.from!.id;

      // MongoDB ga saqlash
      await this.sessionService.findOrCreateUser(userId, name);

      await ctx.reply(
        `👋 Salom, *${name}*!\n\nMen matematik botman. Sizga 10 ta arifmetik savol beraman.\n\nHar bir to'g'ri javob = 1 ball 🏆`,
        {
          parse_mode: 'Markdown',
          ...Markup.keyboard([
            ['🚀 Testni boshlash'],
            ['📊 Mening natijalarim', '❓ Yordam'],
          ])
            .resize()
            .persistent(),
        },
      );
    });

    // ─── /help ────────────────────────────────────────────────
    bot.help(async (ctx) => {
      await this.sendHelp(ctx);
    });

    // ─── Keyboard: Testni boshlash ────────────────────────────
    bot.hears('🚀 Testni boshlash', async (ctx) => {
      await this.startQuiz(ctx);
    });

    // ─── Keyboard: Natijalar ──────────────────────────────────
    bot.hears('📊 Mening natijalarim', async (ctx) => {
      await this.showStats(ctx);
    });

    // ─── Keyboard: Yordam ─────────────────────────────────────
    bot.hears('❓ Yordam', async (ctx) => {
      await this.sendHelp(ctx);
    });

    // ─── Inline: Testni qayta boshlash ────────────────────────
    bot.action('start_quiz', async (ctx) => {
      await ctx.answerCbQuery();
      await this.startQuiz(ctx);
    });

    // ─── Inline: Natijalar ────────────────────────────────────
    bot.action('show_stats', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showStats(ctx);
    });

    // ─── Inline: Qiyinlik darajasi ────────────────────────────
    bot.action(/difficulty_(easy|medium|hard)/, async (ctx) => {
      await ctx.answerCbQuery('✅ Tanlandi!');
      const level = ctx.match[1] as 'easy' | 'medium' | 'hard';
      const userId = ctx.from!.id;
      this.sessionService.setDifficulty(userId, level);

      const labels = { easy: '🟢 Oson', medium: '🟡 O\'rta', hard: '🔴 Qiyin' };
      await ctx.editMessageText(
        `${labels[level]} daraja tanlandi!\n\nTest boshlanmoqda...`,
      );
      await this.startQuiz(ctx);
    });

    // ─── Inline: Savolni o'tkazib yuborish ───────────────────
    bot.action(/skip_(\d+)/, async (ctx) => {
      await ctx.answerCbQuery('⏭ O\'tkazib yuborildi');
      const userId = ctx.from!.id;
      const session = this.sessionService.getSession(userId);

      if (!session || !session.active) return;

      const q = session.questions[session.current];

      session.history.push({
        question: q.question,
        userAnswer: NaN,
        correct: q.answer,
        isCorrect: false,
      });
      session.wrong++;
      session.current++;

      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      if (session.current >= 10) {
        session.active = false;
        await this.sendResult(ctx, userId);
      } else {
        await this.sendNextQuestion(ctx, userId);
      }
    });

    // ─── Text: Javob qabul qilish ─────────────────────────────
    bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const session = this.sessionService.getSession(userId);

      if (!session || !session.active) return;

      const userInput = ctx.message.text.trim();
      const answer = parseInt(userInput, 10);

      if (isNaN(answer)) {
        await ctx.reply('⚠️ Iltimos, faqat *raqam* kiriting!', {
          parse_mode: 'Markdown',
        });
        return;
      }

      await this.handleAnswer(ctx, userId, answer);
    });

    this.logger.log('Barcha handlerlar ro\'yxatdan o\'tdi');
  }

  // ─── Quiz boshlash ──────────────────────────────────────────
  private async startQuiz(ctx: Context) {
    const userId = ctx.from!.id;

    if (!this.sessionService.getDifficulty(userId)) {
      await ctx.reply(
        '🎯 *Qiyinlik darajasini tanlang:*',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('🟢 Oson', 'difficulty_easy'),
              Markup.button.callback('🟡 O\'rta', 'difficulty_medium'),
              Markup.button.callback('🔴 Qiyin', 'difficulty_hard'),
            ],
          ]),
        },
      );
      return;
    }

    const difficulty = this.sessionService.getDifficulty(userId)!;
    const questions = this.mathService.generateQuestions(10, difficulty);
    this.sessionService.createSession(userId, questions, difficulty);

    await ctx.reply(
      `🧮 *Test boshlanmoqda!*\n\n📌 Daraja: ${this.getDifficultyLabel(difficulty)}\n📝 Savollar soni: 10\n\nJavoblarni raqam ko\'rinishida yuboring.`,
      {
        parse_mode: 'Markdown',
        ...Markup.removeKeyboard(),
      },
    );

    await this.sendNextQuestion(ctx, userId);
  }

  // ─── Keyingi savol yuborish ─────────────────────────────────
  private async sendNextQuestion(ctx: Context, userId: number) {
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    const { current, questions } = session;
    const q = questions[current];
    const progressBar = this.makeProgressBar(current, 10);

    await ctx.reply(
      `${progressBar} *${current + 1}/10*\n\n❓ *${q.question}*`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⏭ Savolni o\'tkazib yuborish', `skip_${userId}`)],
        ]),
      },
    );
  }

  // ─── Javobni tekshirish ─────────────────────────────────────
  private async handleAnswer(ctx: Context, userId: number, answer: number) {
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    const q = session.questions[session.current];
    const isCorrect = answer === q.answer;

    if (isCorrect) {
      session.correct++;
      await ctx.reply('✅ *To\'g\'ri!* +1 ball 🎉', { parse_mode: 'Markdown' });
    } else {
      session.wrong++;
      await ctx.reply(
        `❌ *Noto\'g\'ri!*\nTo'g'ri javob: *${q.answer}*`,
        { parse_mode: 'Markdown' },
      );
    }

    session.history.push({
      question: q.question,
      userAnswer: answer,
      correct: q.answer,
      isCorrect,
    });

    session.current++;

    if (session.current >= 10) {
      session.active = false;
      await this.sendResult(ctx, userId);
    } else {
      await this.sendNextQuestion(ctx, userId);
    }
  }

  // ─── Natija yuborish ────────────────────────────────────────
  private async sendResult(ctx: Context, userId: number) {
    const session = this.sessionService.getSession(userId);
    if (!session) return;

    const { correct, wrong, history, difficulty } = session;
    const percent = Math.round((correct / 10) * 100);

    let emoji = '😐';
    let comment = 'Yana mashq qiling.';
    if (correct === 10) { emoji = '🏆'; comment = 'Mukammal natija!'; }
    else if (correct >= 8) { emoji = '🎉'; comment = 'Ajoyib natija!'; }
    else if (correct >= 6) { emoji = '😊'; comment = 'Yaxshi natija!'; }
    else if (correct >= 4) { emoji = '😐'; comment = 'O\'rtacha natija.'; }
    else { emoji = '💪'; comment = 'Ko\'proq mashq kerak!'; }

    // MongoDB ga saqlash
    await this.sessionService.saveResult(userId, correct);

    // Qiyinlikni tozalash — keyingi testda qayta so'raladi
    this.sessionService.clearDifficulty(userId);

    // Tarix
    const historyText = history
      .map((h, i) => {
        const icon = h.isCorrect ? '✅' : '❌';
        const userAns = isNaN(h.userAnswer) ? '⏭' : h.userAnswer;
        const hint = !h.isCorrect && !isNaN(h.userAnswer) ? ` (to'g'ri: ${h.correct})` : '';
        return `${icon} ${i + 1}. ${h.question} = ${userAns}${hint}`;
      })
      .join('\n');

    await ctx.reply(
      `${emoji} *Test yakunlandi!*\n\n` +
      `📊 *Natija:* ${correct}/10 (${percent}%)\n` +
      `✅ To'g'ri: ${correct}\n` +
      `❌ Noto'g'ri: ${wrong}\n` +
      `🎯 Daraja: ${this.getDifficultyLabel(difficulty)}\n\n` +
      `💬 _${comment}_\n\n` +
      `*Savollar tarixi:*\n${historyText}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Qayta boshlash', 'start_quiz'),
            Markup.button.callback('📊 Statistika', 'show_stats'),
          ],
        ]),
      },
    );

    await ctx.reply('Asosiy menyu:', {
      ...Markup.keyboard([
        ['🚀 Testni boshlash'],
        ['📊 Mening natijalarim', '❓ Yordam'],
      ])
        .resize()
        .persistent(),
    });
  }

  // ─── Statistika ─────────────────────────────────────────────
  private async showStats(ctx: Context) {
    const userId = ctx.from!.id;
    const user = await this.sessionService.getStats(userId);

    if (!user || user.totalGames === 0) {
      await ctx.reply(
        '📊 Hali hech qanday test topshirmagansiz!\n\nTestni boshlang:',
        {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🚀 Testni boshlash', 'start_quiz')],
          ]),
        },
      );
      return;
    }

    const avgScore = (user.totalCorrect / user.totalGames).toFixed(1);

    await ctx.reply(
      `📊 *Sizning statistikangiz:*\n\n` +
      `🎮 Jami o'yinlar: *${user.totalGames}*\n` +
      `✅ Jami to'g'ri: *${user.totalCorrect}*\n` +
      `📈 O'rtacha ball: *${avgScore}/10*\n` +
      `🏆 Eng yaxshi natija: *${user.bestScore}/10*`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🚀 Yangi test', 'start_quiz')],
        ]),
      },
    );
  }

  // ─── Yordam ─────────────────────────────────────────────────
  private async sendHelp(ctx: Context) {
    await ctx.reply(
      `❓ *Yordam*\n\n` +
      `Bot matematika bo'yicha test o'tkazadi.\n\n` +
      `*Qanday ishlaydi:*\n` +
      `1. "🚀 Testni boshlash" tugmasini bosing\n` +
      `2. Qiyinlik darajasini tanlang\n` +
      `3. 10 ta savolga javob bering\n` +
      `4. Natijangizni ko'ring\n\n` +
      `*Amallar:*\n` +
      `🚀 Testni boshlash — Yangi test\n` +
      `📊 Natijalarim — Statistika\n` +
      `❓ Yordam — Shu sahifa`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🚀 Testni boshlash', 'start_quiz')],
        ]),
      },
    );
  }

  // ─── Yordamchi metodlar ─────────────────────────────────────
  private makeProgressBar(current: number, total: number): string {
    const filled = Math.floor((current / total) * 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  }

  private getDifficultyLabel(d: string): string {
    return { easy: '🟢 Oson', medium: '🟡 O\'rta', hard: '🔴 Qiyin' }[d] ?? d;
  }
}