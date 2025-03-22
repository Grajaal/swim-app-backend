import {
  Controller,
  Post,
  UseGuards,
  Req,
  Body,
  Res,
  Get
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { Request, Response } from 'express'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() userData: RegisterDto) {
    return this.authService.register(userData)
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token } = this.authService.login(req.user)

    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 3600000
    })

    return { message: 'Successful login' }
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  validate(@Req() req: Request) {
    return {
      isAuthenticated: true,
      user: req.user
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt')
    return { message: 'Logout successful' }
  }
}
