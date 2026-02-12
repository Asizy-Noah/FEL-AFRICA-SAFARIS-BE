import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"
import * as mongoose from "mongoose"
import type { Tour } from "../../tours/schemas/tour.schema"

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Schema({ timestamps: true })
export class Review extends Document {
  // --- FRONTEND SNIPPET FIELDS ---

  // Corresponds to <h5 class="font-weight-bold mb-3">Unforgettable Gorilla Trekking Experience</h5>
  @Prop({ required: true, trim: true })
  title: string // E.g., "Unforgettable Gorilla Trekking Experience"

  // Corresponds to <i class="fa fa-user mr-2"></i>Sarah Johnson (If submitted internally, otherwise user provides it)
  @Prop({ required: true, trim: true })
  clientName: string // Used 'clientName' for clarity to distinguish from a User Model

  // Corresponds to <i class="fa fa-star text-warning"></i>...
  @Prop({ required: true, min: 1, max: 5 })
  rating: number

  // Corresponds to the main review text paragraph
  @Prop({ required: true })
  comment: string

  // Corresponds to the dynamic logo image, and the 'View Full Review' link destination
  @Prop()
  source: string // E.g., 'google', 'safari_bookings', 'trip_advisor'

  // Corresponds to <a href="..." target="_blank">View Full Review</a>
  @Prop({ required: true })
  externalLink: string // URL to the full review on the external platform  

  
  @Prop({ required: true })
  reviewDate: Date // Date the review was written/posted on the source platform
  
  // --- ORIGINAL FIELDS (kept or renamed for clarity) ---

  // Original fields for internal tracking/submission (Email is often optional for display)
  @Prop()
  email: string

  @Prop()
  country: string // Kept, as client location might be useful metadata

  @Prop({ required: true, enum: ReviewStatus, default: ReviewStatus.PENDING })
  status: ReviewStatus // Kept for moderation

  // If the review is associated with a tour, or submitted internally by a user
  @Prop()
  tour: string
  
  // Optional admin response fields
  @Prop() 
  response: string

  @Prop()
  responseDate: Date
}

export const ReviewSchema = SchemaFactory.createForClass(Review)

// Add text index for search functionality
ReviewSchema.index({ clientName: "text", email: "text", comment: "text", title: "text", country: "text" })