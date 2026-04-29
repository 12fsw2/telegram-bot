import { Injectable } from '@nestjs/common';

export interface Question {
  question: string;
  answer: number;
}

type Difficulty = 'easy' | 'medium' | 'hard';

@Injectable()
export class MathService {
  generateQuestions(count: number, difficulty: Difficulty): Question[] {
    const questions: Question[] = [];
    for (let i = 0; i < count; i++) {
      questions.push(this.makeQuestion(difficulty));
    }
    return questions;
  }

  private makeQuestion(difficulty: Difficulty): Question {
    const ops = this.getOps(difficulty);
    const op = ops[Math.floor(Math.random() * ops.length)];

    let a: number, b: number, answer: number, symbol: string;

    switch (difficulty) {
      case 'easy':
        a = this.rand(1, 20);
        b = this.rand(1, 20);
        break;
      case 'medium':
        a = this.rand(10, 99);
        b = this.rand(10, 99);
        break;
      case 'hard':
        a = this.rand(50, 999);
        b = this.rand(50, 999);
        break;
    }

    switch (op) {
      case '+':
        answer = a + b;
        symbol = '+';
        break;
      case '-':
        if (a < b) [a, b] = [b, a];
        answer = a - b;
        symbol = '−';
        break;
      case '*':
        a = this.rand(2, difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 20);
        b = this.rand(2, difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 20);
        answer = a * b;
        symbol = '×';
        break;
      case '/':
        b = this.rand(2, 12);
        answer = this.rand(2, 20);
        a = b * answer;
        symbol = '÷';
        break;
      default:
        answer = a + b;
        symbol = '+';
    }

    return { question: `${a} ${symbol} ${b} = ?`, answer };
  }

  private getOps(difficulty: Difficulty): string[] {
    switch (difficulty) {
      case 'easy':   return ['+', '-'];
      case 'medium': return ['+', '-', '*'];
      case 'hard':   return ['+', '-', '*', '/'];
    }
  }

  private rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}