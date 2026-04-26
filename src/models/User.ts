import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: "USER" | "CREATOR" | "MODERATOR" | "ADMIN";
  authProvider: "CREDENTIALS" | "GOOGLE";
  providerAccountId?: string;
  isEmailVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetOtp?: string;
  resetOtpExpiry?: Date;
  resetOtpAttempts?: number;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  profile?: {
    bio?: string;
    socialLinks?: {
      twitter?: string;
      github?: string;
      website?: string;
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
    resetOtp: { type: String },
    resetOtpExpiry: { type: Date },
    resetOtpAttempts: { type: Number, default: 0 },
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    profile: {
      bio: { type: String },
      socialLinks: {
        twitter: { type: String },
        github: { type: String },
        website: { type: String },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
