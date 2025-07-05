import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import * as cookieParser from 'cookie-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const config = new DocumentBuilder()
    .setTitle('Swim App')
    .setDescription('App for swimming coaches')
    .setVersion('1.0')
    .addTag('swim')
    .build()
  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, documentFactory)

  app.useGlobalPipes(new ValidationPipe())

  app.setGlobalPrefix('api')
  app.use(cookieParser())

  // Enhanced CORS configuration for cross-domain cookies
  app.enableCors({
    origin: ['http://localhost:3000', 'https://swimapp-demo.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    credentials: true,
    optionsSuccessStatus: 200
  })

  // Debug logging for production
  console.log('Server starting with CORS origins:', [
    'http://localhost:3000',
    'https://swimapp-demo.vercel.app'
  ])
  console.log('Port:', process.env.PORT ?? 4001)

  await app.listen(process.env.PORT ?? 4001)
}
bootstrap().catch((err) =>
  console.error('Error durante el inicio de la aplicación:', err)
)
