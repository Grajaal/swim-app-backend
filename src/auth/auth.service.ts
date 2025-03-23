import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from 'src/users/users.service'
import { RegisterDto } from './dto/register.dto'
import * as bcrypt from 'bcrypt'
import { User } from '@prisma/client'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(
    email: string,
    pass: string
  ): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.user({ email })

    if (!user || !user.password) {
      throw new UnauthorizedException('Email or password are wrong')
    }

    const passMatch = await bcrypt.compare(pass, user?.password)

    if (!passMatch) {
      throw new UnauthorizedException('Email or password are wrong')
    }

    const { password: _password, ...result } = user

    return result
  }

  async register(userData: RegisterDto) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    await this.usersService.createUser({
      ...userData,
      password: hashedPassword
    })
  }

  login(user: Partial<User> | undefined): { token: string } {
    const payload = { sub: user?.id, email: user?.email, role: user?.role }
    const token = this.jwtService.sign(payload)
    return { token }
  }
}
