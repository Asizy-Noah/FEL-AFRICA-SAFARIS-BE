import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import * as mongoose from "mongoose";
import { Category } from "src/modules/categories/schemas/category.schema";
import { Country } from "src/modules/countries/schemas/country.schema";

export enum BlogStatus {
  VISIBLE = "visible",
  HIDDEN = "hidden",
  DRAFT = "draft",
  ARCHIVED = "archived",
}

@Schema()
export class BlogSection {
  @Prop({ required: true }) 
  type: string; // 'intro', 'paragraph', 'tour', 'page', 'conclusion'

  @Prop() 
  title?: string; // Sub-heading for paragraphs

  @Prop() 
  body?: string; // Quill HTML content

  // References for "Attach" functionality & Standalone blocks
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Tour' })
  tourId?: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' })
  destinationId?: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Country' })
  countryId?: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Page' })
  pageId?: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' })
  relatedBlogId?: Types.ObjectId;

  @Prop()
  externalLink?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  referenceId?: any;

  // For paragraph multiple attachments (IDs stored as strings or ObjectIds)
  @Prop({ type: [{ type: String }] })
  attachedItems?: string[];
}

@Schema({ timestamps: true })
export class Blog extends Document {
  @Prop({ required: true }) 
  title: string;

  @Prop({ required: true, unique: true }) 
  slug: string;

  @Prop() 
  excerpt: string;

  @Prop({ type: [BlogSection], default: [] }) 
  sections: BlogSection[];

  @Prop({ required: true }) 
  coverImage: string;

  @Prop([String]) 
  tags: string[];

  @Prop({ required: true, enum: BlogStatus, default: BlogStatus.VISIBLE }) 
  status: BlogStatus;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Country" }] })
    countries: Country[];
  
    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }] })
    categories: Category[];
  
  // SEO Fields
  @Prop() seoTitle: string;
  @Prop() seoDescription: string;
  @Prop() seoKeywords: string;
  @Prop() seoCanonicalUrl: string;
  @Prop() seoOgImage: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" }) 
  author: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" }) 
  updatedBy?: Types.ObjectId;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);