import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question } from '../math/math.service';
import { User, UserDocument } from '../schemas/user.schema';

export interface AnswerHistory {
  question: string;
  userAnswer: number;
  correct: number;
  isCorrect: boolean;
}

export interface UserSession {
  active: boolean;
  questions: Question[];
  current: number;
  correct: number;
  wrong: number;
  difficulty: string;
  history: AnswerHistory[];
  startedAt: Date;
}

@Injectable()
export class SessionService {
  // Xotirada saqlanadigan sessiyalar (faqat aktiv o'yin uchun)
  private sessions = new Map<number, UserSession>();
  private difficulties = new Map<number, 'easy' | 'medium' | 'hard'>();

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // ─── Session ─────────────────────────────────────────────────
  createSession(userId: number, questions: Question[], difficulty: string): UserSession {
    const session: UserSession = {
      active: true,
      questions,
      current: 0,
      correct: 0,
      wrong: 0,
      difficulty,
      history: [],
      startedAt: new Date(),
    };
    this.sessions.set(userId, session);
    return session;
  }

  getSession(userId: number): UserSession | undefined {
    return this.sessions.get(userId);
  }

  deleteSession(userId: number): void {
    this.sessions.delete(userId);
  }

  // ─── Difficulty ──────────────────────────────────────────────
  setDifficulty(userId: number, level: 'easy' | 'medium' | 'hard'): void {
    this.difficulties.set(userId, level);
  }

  getDifficulty(userId: number): 'easy' | 'medium' | 'hard' | undefined {
    return this.difficulties.get(userId);
  }

  clearDifficulty(userId: number): void {
    this.difficulties.delete(userId);
  }

  // ─── MongoDB: Foydalanuvchi yaratish / topish ────────────────
  async findOrCreateUser(telegramId: number, firstName: string): Promise<UserDocument> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { $setOnInsert: { telegramId, firstName } },
      { upsert: true, new: true },
    );
    return user;
  }

  // ─── MongoDB: Natija saqlash ─────────────────────────────────
  async saveResult(userId: number, score: number): Promise<void> {
    const user = await this.userModel.findOne({ telegramId: userId });
    if (!user) return;

    user.totalGames += 1;
    user.totalCorrect += score;
    if (score > user.bestScore) {
      user.bestScore = score;
    }
    await user.save();
  }

  // ─── MongoDB: Statistika olish ───────────────────────────────
  async getStats(userId: number): Promise<UserDocument | null> {
    return this.userModel.findOne({ telegramId: userId });
  }
}