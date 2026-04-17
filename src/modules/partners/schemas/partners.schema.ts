import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PartnerDocument = Partner & Document;

@Schema({ timestamps: true })
export class Partner {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  logo: string; // File path: /uploads/partners/filename.jpg

  @Prop({ trim: true })
  url: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;
}

export const PartnerSchema = SchemaFactory.createForClass(Partner);