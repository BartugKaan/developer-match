import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../users/user.service';
import { RegisterDto, LoginDto } from './dto';
import { UserDocument } from '../users/schemas/user.schema';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  username: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ==================== REGISTER ====================
  async register(
    dto: RegisterDto,
  ): Promise<{ user: UserDocument; tokens: AuthTokens }> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      username: dto.username,
      displayName: dto.displayName,
      password: hashedPassword,
    });

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return { user, tokens };
  }

  // ==================== LOGIN ====================
  async login(
    dto: LoginDto,
  ): Promise<{ user: UserDocument; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Email or password invalid');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email or password invalid');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    (user as unknown as Record<string, unknown>).password = undefined;

    return { user, tokens };
  }

  // ==================== GITHUB OAuth ====================
  async handleGithubAuth(githubProfile: {
    githubId: string;
    email: string;
    username: string;
    displayName: string;
    avatar: string;
    accessToken: string;
  }): Promise<{ user: UserDocument; tokens: AuthTokens }> {
    let user = await this.usersService.findByGithubId(githubProfile.githubId);

    if (user) {
      user = await this.usersService.updateGithubInfo(user._id.toString(), {
        githubId: githubProfile.githubId,
        githubUsername: githubProfile.username,
        githubAccessToken: githubProfile.accessToken,
        avatar: githubProfile.avatar,
      });
    } else {
      const existingUser = await this.usersService.findByEmail(
        githubProfile.email,
      );

      if (existingUser) {
        user = await this.usersService.updateGithubInfo(
          existingUser._id.toString(),
          {
            githubId: githubProfile.githubId,
            githubUsername: githubProfile.username,
            githubAccessToken: githubProfile.accessToken,
            avatar: githubProfile.avatar || existingUser.avatar,
          },
        );
      } else {
        let username = githubProfile.username;
        const existingUsername =
          await this.usersService.findByUsername(username);
        if (existingUsername) {
          username = `${username}_${Date.now().toString(36)}`;
        }

        user = await this.usersService.create({
          email: githubProfile.email,
          username,
          displayName: githubProfile.displayName || githubProfile.username,
          avatar: githubProfile.avatar,
          githubId: githubProfile.githubId,
          githubUsername: githubProfile.username,
          githubAccessToken: githubProfile.accessToken,
        });
      }
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return { user, tokens };
  }

  // ==================== REFRESH TOKEN ====================
  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.usersService.findByIdWithRefreshToken(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  // ==================== LOGOUT ====================
  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  // ==================== HELPERS ====================
  private async generateTokens(user: UserDocument): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.getOrThrow<string>(
          'jwt.accessExpiresIn',
        ) as unknown as number,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow<string>(
          'jwt.refreshExpiresIn',
        ) as unknown as number,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    if (refreshToken) {
      const hashedToken = await bcrypt.hash(refreshToken, 12);
      await this.usersService.updateRefreshToken(userId, hashedToken);
    } else {
      await this.usersService.updateRefreshToken(userId, null);
    }
  }

  async validateJwtUser(payload: JwtPayload): Promise<UserDocument> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
