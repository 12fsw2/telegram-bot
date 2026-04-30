// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   const PORT = process.env.PORT || 3000;
//   await app.listen(PORT, '0.0.0.0');
//   console.log(`🤖 Matematik bot ishga tushdi! Port: ${PORT}`);
// }

// bootstrap();



import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json());

  const PORT = process.env.PORT || 3000;

  await app.listen(PORT, '0.0.0.0');

  console.log(`🤖 Matematik bot ishga tushdi! Port: ${PORT}`);
}

bootstrap();