import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(_id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(_id);

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password');
  }

  async findByGithubId(githubId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ githubId });
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username });
  }

  async create(data: Partial<User>): Promise<UserDocument> {
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }

    const existingEmail = await this.findByEmail(data.email);

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    if (data.username) {
      const existingUsername = await this.findByUsername(data.username);
      if (existingUsername) {
        throw new ConflictException('Username already exists');
      }
    }

    const user = new this.userModel(data);
    return user.save();
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken });
  }

  async findByIdWithRefreshToken(userId: string): Promise<UserDocument | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.userModel.findById(userId).select('+refreshToken');
  }

  async updateGithubInfo(
    userId: string,
    githubData: {
      githubId: string;
      githubUsername: string;
      githubAccessToken: string;
      avatar?: string;
    },
  ): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: githubData },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
