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

    // Better HTTPS detection for production environments
    const protocol = req.get('x-forwarded-proto') || req.protocol
    const isSecure = protocol === 'https'

    // Debug logging to understand what's happening in production
    console.log('Login cookie setup debug:', {
      protocol: req.protocol,
      'x-forwarded-proto': req.get('x-forwarded-proto'),
      secure: req.secure,
      isSecure,
      origin: req.get('origin'),
      host: req.get('host'),
      userAgent: req.get('user-agent')
    })

    const cookieOptions = {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      secure: isSecure,
      sameSite: isSecure ? ('none' as const) : ('lax' as const),
      path: '/'
    }

    console.log('Cookie options:', cookieOptions)

    res.cookie('jwt', token, cookieOptions)

    // Also send token in response for debugging
    return {
      user: req.user,
      debug: {
        cookieSet: true,
        isSecure,
        cookieOptions
      }
    }
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
    const protocol = req.get('x-forwarded-proto') || req.protocol
    const isSecure = protocol === 'https'

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? ('none' as const) : ('lax' as const),
      path: '/'
    })
    return { message: 'Logout successful' }
  }
}
