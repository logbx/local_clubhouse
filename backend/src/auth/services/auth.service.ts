import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { RegisterDto, LoginDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ accessToken: string; refreshToken: string }> {
    const { password, ...rest } = registerDto;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      ...rest,
      password: hashedPassword,
    });

    const savedUser = await user.save();
    return this.generateTokens(savedUser.id);
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userModel.findOne({ email: loginDto.email }).exec();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id);
  }

  async logout(userId: string): Promise<void> {
    // In a production environment, we would invalidate the token in Redis
    return;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const accessToken = await this.generateAccessToken(payload.sub);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId),
      this.generateRefreshToken(userId),
    ]);

    return { accessToken, refreshToken };
  }

  private async generateAccessToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId },
      { expiresIn: '15m' },
    );
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId },
      { expiresIn: '7d' },
    );
  }
} 