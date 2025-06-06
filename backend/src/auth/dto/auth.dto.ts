import { IsEmail, IsString, MinLength, IsArray, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../users/schemas/user.schema';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class TokenResponseDto {
  @IsString()
  accessToken: string;

  @IsString()
  refreshToken: string;

  user: {
    id: string;
    email: string;
    username: string;
    roles: UserRole[];
  };
} 