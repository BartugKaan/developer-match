import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'jhon.doe@mail.com' })
  @IsEmail({}, { message: 'Please enter a valid email' })
  email: string;

  @ApiProperty({ example: 'jhon_doe' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, _ and -',
  })
  username: string;

  @ApiProperty({ example: 'Jhon' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one number',
  })
  password: string;
}
