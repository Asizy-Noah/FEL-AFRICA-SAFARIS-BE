import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document, Types } from "mongoose"
import * as mongoose from "mongoose"
import { User } from "../../users/schemas/user.schema"
import { Country } from "../../countries/schemas/country.schema"
import { Category } from "../../categories/schemas/category.schema"

// harmonized enum to match form values
export enum BlogStatus {
  // PUBLISHED = "published", // Use 'visible' for published
  VISIBLE = "visible", // Matches form option
  HIDDEN = "hidden",   // Matches form option
  DRAFT = "draft",     // Retain draft if still needed internally
  ARCHIVED = "archived", // Retain archived if still needed internally
}

@Schema({ timestamps: true })
export class Blog extends Document {
  @Prop({ required: true })
  title: string

  @Prop({ required: true, unique: true })
  slug: string

  @Prop()
  excerpt: string

  @Prop({ required: true })
  content: string

  @Prop({ required: true })
  coverImage: string // Remains `coverImage`

  @Prop([String])
  tags: string[]

  // Updated enum type and default value
  @Prop({ required: true, enum: BlogStatus, default: BlogStatus.DRAFT })
  status: BlogStatus


  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }] })
  categories: Category[]

  @Prop({ type: Number, default: 0 })
  views: number;

  // SEO fields - No changes needed, they match
  @Prop()
  seoTitle: string

  @Prop()
  seoDescription: string

  @Prop()
  seoKeywords: string

  @Prop()
  seoCanonicalUrl: string

  @Prop()
  seoOgImage: string

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  author: Types.ObjectId | User

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId | User

  // --- FIX: Explicitly declare createdAt and updatedAt for TypeScript ---
  createdAt?: Date;
  updatedAt?: Date;
  // --- END FIX ---
}

export const BlogSchema = SchemaFactory.createForClass(Blog)

BlogSchema.index({
  title: "text",
  excerpt: "text",
  content: "text",
  tags: "text",
  seoKeywords: "text",
})
