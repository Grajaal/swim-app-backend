import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import * as cookieParser from 'cookie-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

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

  app.setGlobalPrefix('api')
  app.use(cookieParser())
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET, POST, PUT, DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true
  })
  await app.listen(process.env.PORT ?? 4001)
}
bootstrap().catch((err) =>
  console.error('Error durante el inicio de la aplicación:', err)
)
