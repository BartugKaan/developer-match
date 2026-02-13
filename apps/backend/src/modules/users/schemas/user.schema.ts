import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class TechSkill {
  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
  })
  level: string;
}

export const TechSkillSchema = SchemaFactory.createForClass(TechSkill);

@Schema({ _id: false })
export class AnalyzedSkills {
  @Prop({ type: [{ name: String, percentage: Number }], default: [] })
  languages: { name: string; percentage: number }[];

  @Prop({ type: [String], default: [] })
  frameworks: string[];

  @Prop({ type: [String], default: [] })
  tools: string[];

  @Prop({ default: 0 })
  overallScore: number;
}

export const AnalyzedSkillsSchema =
  SchemaFactory.createForClass(AnalyzedSkills);

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ enum: ['easy', 'medium', 'hard', 'expert'] })
  projectDifficulty: string;

  @Prop({ enum: ['solo', 'small', 'medium', 'large'] })
  teamSize: string;

  @Prop({ type: [String], default: [] })
  prefferedTopics: string[];
}

export const UserPreferencesSchema =
  SchemaFactory.createForClass(UserPreferences);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ select: false })
  password: string;

  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop()
  avatar: string;

  @Prop({ maxlength: 500 })
  bio: string;

  @Prop({ unique: true, sparse: true })
  githubId: string;

  @Prop()
  githubUsername: string;

  @Prop({ select: false })
  githubAccessToken: string;

  @Prop({ type: [TechSkillSchema], default: [] })
  techStack: TechSkill[];

  @Prop({ enum: ['junior', 'mid', 'senior', 'lead'], default: 'junior' })
  experienceLevel: string;

  @Prop({ type: AnalyzedSkillsSchema })
  analyzedSkills: AnalyzedSkills;

  @Prop({ type: UserPreferencesSchema, default: {} })
  preferences: UserPreferences;

  // Status
  @Prop({ default: false })
  isProfileComplete: boolean;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop()
  lastSeen: Date;

  @Prop({ select: false })
  refreshToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ githubId: 1 });
UserSchema.index({ 'techStack.name': 1 });
UserSchema.index({ experienceLevel: 1 });
