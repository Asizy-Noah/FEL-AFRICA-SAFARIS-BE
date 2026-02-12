import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import * as mongoose from "mongoose";
import type { User } from "../../users/schemas/user.schema";

export enum PageStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export enum PageType {
  ABOUT = "about",
  CONTACT = "contact",
  TERMS = "terms",
  PRIVACY = "privacy",
  FAQ = "faq",
  COMMUNITY = "community",
  CUSTOM = "custom",
}

// --- PageContentBlock: REMOVED 'image' field ---
@Schema({ _id: false })
export class PageContentBlock {
  @Prop({ required: true })
  type: string; // e.g., 'text'

  @Prop({ required: false })
  title?: string; // Optional title for each content block

  @Prop({ required: false }) // The actual content (HTML from Quill)
  content?: string;

  // REMOVED: @Prop({ required: false }) image?: string;
  // REMOVED: @Prop() videoUrl?: string; // If you had this, remove it too
}

export const PageContentBlockSchema = SchemaFactory.createForClass(PageContentBlock);

// --- Main Page Schema ---
@Schema({ timestamps: true, collection: 'pages' })
export class Page extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true, enum: PageType })
  pageType: PageType;

  @Prop({ type: [PageContentBlockSchema], default: [] })
  contentBlocks: PageContentBlock[];

  @Prop()
  description: string;

  @Prop()
  coverImage?: string;

  @Prop({ type: [String], default: [] })
  galleryImages: string[];

  @Prop({ required: true, enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  // SEO fields
  @Prop()
  seoTitle?: string;

  @Prop()
  seoDescription?: string;

  @Prop({ type: [String] }) // Ensure this is Array of Strings if that's the intention
  seoKeywords?: string[];

  @Prop()
  seoCanonicalUrl?: string;

  @Prop()
  seoOgImage?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId | User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  updatedBy: Types.ObjectId;
}

export const PageSchema = SchemaFactory.createForClass(Page);

// Add text index for search functionality
PageSchema.index({
  title: "text",
  "contentBlocks.title": "text",
  "contentBlocks.content": "text",
  description: "text",
  seoKeywords: "text",
});