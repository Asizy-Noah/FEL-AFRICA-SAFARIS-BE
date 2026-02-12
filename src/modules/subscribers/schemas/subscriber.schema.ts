import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document, Types } from "mongoose" // Import Types

@Schema({ timestamps: true })
export class Subscriber extends Document {
  @Prop()
  name: string

  @Prop({ required: true, unique: true })
  email: string

  @Prop()
  phoneNumber: string

  @Prop({ default: true })
  isActive: boolean

  // Explicitly define createdAt and updatedAt for TypeScript
  // Mongoose adds these automatically with { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber)

// Add text index for search functionality
SubscriberSchema.index({ name: "text", email: "text", phoneNumber: "text" })