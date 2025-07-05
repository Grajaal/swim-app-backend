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
import { JwtRequest } from './interfaces/jwt-payload.interface'

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

    const isProduction = process.env.NODE_ENV === 'production'

    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    })

    return { user: req.user }
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  validate(@Req() req: JwtRequest) {
    return {
      isAuthenticated: true,
      user: req.user
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const isProduction = process.env.NODE_ENV === 'production'

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    })
    return { message: 'Logout successful' }
  }
}
