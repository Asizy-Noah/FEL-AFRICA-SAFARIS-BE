import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import * as mongoose from "mongoose";
import type { User } from "../../users/schemas/user.schema";
import type { Country } from "../../countries/schemas/country.schema"
import type { Category } from "../../categories/schemas/category.schema"
import type { Destination } from "../../destinations/schemas/destination.schema"


export enum TourStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

@Schema({ timestamps: true })
export class Tour extends Document {
  @Prop({ required: true })
  title: string; // Corresponds to 'name' in HTML for country, assuming 'title' for tour

  @Prop({ required: true, unique: true })
  slug: string; // Not explicitly in HTML, but common for titles. Keeping it.

  @Prop({ required: true })
  overview: string; // Corresponds to 'countryOverview' in HTML

  @Prop()
  highlights: string;

  @Prop()
  summary: string; 

  @Prop()
  coverImage: string; 

  
  @Prop({ required: true })
  days: number;

  @Prop({ required: true })
  price: number;

  @Prop()
  discountPrice: number;

  @Prop()
  groupSize: number;

  @Prop([String])
  galleryImages: string[];

  @Prop({ required: true, enum: TourStatus, default: TourStatus.DRAFT })
  status: TourStatus;

  @Prop({ default: false })
  isFeatured: boolean;

  // Assuming you still want these for a Tour, even if not in the 'Add Country' form example.
  // If the "Add Country" form should replace "Country" with "Tour" and "Category" inputs,
  // then you'd need to add those to your form.
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Country" }] })
  countries: Country[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }] })
  categories: Category[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Destination" }] })
  destinations: Destination[];

  @Prop([
    {
      day: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      accommodation: { type: String },
      meals: { type: String },
      activities: [String],
      image: { type: String },
    },
  ])
  itineraries: {
    day: String;
    title: string;
    description: string;
    accommodation: string;
    meals: string;
    activities: string[];
    image: string;
  }[];

  @Prop()
  priceIncludes: string; // Add this field to your schema

  @Prop()
  priceExcludes: string; // Add this field to your schema

  // SEO fields - all present in the HTML form
  @Prop()
  seoTitle: string;

  @Prop()
  seoDescription: string;

  @Prop()
  seoKeywords: string;

  @Prop()
  seoCanonicalUrl: string;

  @Prop()
  seoOgImage: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId | User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId | User;

  // Add the views field
  @Prop({ type: Number, default: 0 })
  views: number; // New field for popularity tracking

  // --- FIX: Explicitly declare createdAt and updatedAt for TypeScript ---
  createdAt?: Date;
  updatedAt?: Date;
  // --- END FIX ---
}

export const TourSchema = SchemaFactory.createForClass(Tour);

// Add text index for search functionality
TourSchema.index({
  title: "text",
  overview: "text",
  description: "text",
  summary: "text",
  seoKeywords: "text",
});
