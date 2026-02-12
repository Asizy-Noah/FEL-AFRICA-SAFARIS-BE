import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document, Types } from "mongoose"
import * as mongoose from "mongoose"
import type { Tour } from "../../tours/schemas/tour.schema"
import type { User } from "../../users/schemas/user.schema"

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ required: true })
  fullName: string

  @Prop({ required: true })
  email: string

  @Prop()
  phoneNumber: string

  @Prop()
  country: string

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Tour" })
  tour: Tour

  @Prop()
  customTourRequest: string

  @Prop()
  travelDate: Date

  @Prop({ default: 0 })
  numberOfAdults: number

  @Prop({ default: 0 })
  numberOfChildren: number

  @Prop()
  specialRequirements: string

  @Prop({ required: true, enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus

  @Prop()
  adminNotes: string

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  assignedTo: Types.ObjectId | User

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId | User
}

export const BookingSchema = SchemaFactory.createForClass(Booking)

// Add text index for search functionality
BookingSchema.index({
  fullName: "text",
  email: "text",
  phoneNumber: "text",
  country: "text",
  customTourRequest: "text",
  specialRequirements: "text",
  adminNotes: "text",
})
