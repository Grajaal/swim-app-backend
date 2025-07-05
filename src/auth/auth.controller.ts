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

    // Detect if we're on HTTPS or HTTP
    const isSecure = req.secure || req.get('x-forwarded-proto') === 'https'

    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      secure: isSecure, // Only secure if HTTPS
      sameSite: isSecure ? 'none' : 'lax' // none for HTTPS cross-origin, lax for HTTP
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
    const isSecure = req.secure || req.get('x-forwarded-proto') === 'https'

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax'
    })
    return { message: 'Logout successful' }
  }
}
