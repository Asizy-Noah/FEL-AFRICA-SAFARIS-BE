import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HeroSlideDocument = HeroSlide & Document;

@Schema({ timestamps: true })
export class HeroSlide {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  titleEnd: string; // For the highlighted/colored part of the title

  @Prop({ trim: true })
  caption: string;

  @Prop({ required: true })
  photo: string; // File path: /uploads/hero/filename.jpg

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;
}

export const HeroSlideSchema = SchemaFactory.createForClass(HeroSlide);