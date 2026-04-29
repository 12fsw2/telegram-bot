import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  telegramId: number;

  @Prop()
  firstName: string;

  @Prop({ default: 'medium' })
  difficulty: string;

  @Prop({ default: 0 })
  totalGames: number;

  @Prop({ default: 0 })
  totalCorrect: number;

  @Prop({ default: 0 })
  bestScore: number;
}

export const UserSchema = SchemaFactory.createForClass(User);