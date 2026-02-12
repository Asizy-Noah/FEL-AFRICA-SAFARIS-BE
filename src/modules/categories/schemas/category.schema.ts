// src/modules/categories/schemas/category.schema.ts

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import * as mongoose from "mongoose";
import type { User } from "../../users/schemas/user.schema";
import type { Country } from "../../countries/schemas/country.schema"; // Import the Country schema
import mongoosePaginate from 'mongoose-paginate-v2';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop()
  image: string; // This will now typically be the category's cover image path

  // New field: Link to the Country schema
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Country", required: false }) // Make it required: false for "All Countries" option
  country?: Country; // Use 'Country' as the type reference for population

  // SEO Fields (copied from your add category ejs, assume they will be added)
  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  @Prop()
  seoKeywords?: string;

  // Audit fields
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  createdBy: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  updatedBy: User;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.plugin(mongoosePaginate);

// Add text index for search functionality
CategorySchema.index({ name: "text", description: "text" });