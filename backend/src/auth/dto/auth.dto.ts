import { IsEmail, IsString, MinLength, IsArray, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../users/schemas/user.schema';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class TokenDto {
  @IsString()
  refreshToken: string;
} 