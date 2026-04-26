import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional for OAuth
  image?: string;
  role: "USER" | "CREATOR" | "MODERATOR" | "ADMIN";
  authProvider: "CREDENTIALS" | "GOOGLE";
  providerAccountId?: string; // For linking OAuth accounts
  isEmailVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  profile?: {
    bio?: string;
    socialLinks?: {
      twitter?: string;
      github?: string;
      website?: string;
    };
    stats?: {
      postsCount?: number;
      followersCount?: number;
    };
  };
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional
    image: { type: String },
    role: {
      type: String,
      enum: ["USER", "CREATOR", "MODERATOR", "ADMIN"],
      default: "USER",
    },
    authProvider: {
      type: String,
      enum: ["CREDENTIALS", "GOOGLE"],
      default: "CREDENTIALS",
    },
    providerAccountId: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    profile: {
      bio: { type: String },
      socialLinks: {
        twitter: { type: String },
        github: { type: String },
        website: { type: String },
      },
      stats: {
        postsCount: { type: Number, default: 0 },
        followersCount: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
