import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "src/users/users.service";
import { RegisterDto } from "./dto/register.dto";
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.user({ email });
    if (user?.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async register(user: RegisterDto) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    return this.usersService.createUser({
      ...user,
      password: hashedPassword,
    });
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.userId }
    return {
      access_token: this.jwtService.sign(payload),
    }
  }
}