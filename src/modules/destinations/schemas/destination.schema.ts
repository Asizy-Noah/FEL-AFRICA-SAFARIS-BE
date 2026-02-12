import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import * as mongoose from "mongoose";
import type { Country } from "../../countries/schemas/country.schema";
import type { Category } from "../../categories/schemas/category.schema";

@Schema({ timestamps: true })
export class Destination extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  coverImage: string; // /uploads/destinations/filename.ext

  @Prop()
  image: string; // optional additional image

  @Prop({ required: true })
  description: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Country" })
  country: Country | string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }] })
  categories: Category[] | string[];

  @Prop()
  seoTitle: string;

  @Prop()
  seoDescription: string;

  @Prop()
  seoKeywords: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DestinationSchema = SchemaFactory.createForClass(Destination);
DestinationSchema.index({ name: "text", description: "text", seoKeywords: "text" });
