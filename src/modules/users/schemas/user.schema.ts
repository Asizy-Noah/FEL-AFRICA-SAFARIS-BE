import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose" // Import Document from 'mongoose'
import * as bcrypt from "bcrypt"

export enum UserRole {
  ADMIN = "admin",
  AGENT = "agent",
}

export enum UserStatus {
  PENDING = "pending",
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Schema({ timestamps: true })
export class User extends Document { // Ensure 'extends Document' is here
  @Prop({ required: true })
  name: string

  @Prop({ required: true, unique: true })
  email: string

  @Prop({ required: true })
  password: string

  @Prop({ required: true, enum: UserRole, default: UserRole.AGENT })
  role: UserRole

  @Prop({ required: true, enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus

  @Prop()
  phoneNumber: string

  @Prop()
  companyName: string

  @Prop()
  companyWebsite: string

  @Prop()
  country: string

  @Prop()
  resetPasswordToken: string

  @Prop()
  resetPasswordExpires: Date

  // REMOVE comparePassword FROM HERE. It will be added to the schema below.
  // async comparePassword(candidatePassword: string): Promise<boolean> {
  //   return bcrypt.compare(candidatePassword, this.password)
  // }
}

export const UserSchema = SchemaFactory.createForClass(User)

// === ADD THE comparePassword METHOD TO THE SCHEMA'S METHODS HERE ===
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  // 'this' in this context refers to the Mongoose document instance
  return bcrypt.compare(candidatePassword, this.password);
};
// ===================================================================

// Pre-save hook to hash password
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Optional: Extend the User Document type to include the comparePassword method
// This helps with TypeScript type checking in your services
declare module 'mongoose' {
  interface Document {
    comparePassword: (candidatePassword: string) => Promise<boolean>;
  }
}