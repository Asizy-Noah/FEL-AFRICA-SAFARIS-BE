import { PartialType } from "@nestjs/mapped-types"
import { CreateCountryDto } from "./create-country.dto"
import {
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsDate,
    IsArray,
    ArrayMinSize,
    ValidateNested,
  } from 'class-validator';
  import { Type } from 'class-transformer';

export class UpdateCountryDto extends PartialType(CreateCountryDto) {
    @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  overview?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  // For coverImage, it can be a string (path) or a signal like 'new' or 'keep' from the form
  @IsOptional()
  @IsString()
  coverImage?: string; // This will hold the path or 'new'/'keep' signal

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryImages?: string[]; // Array of image paths

  // SEO Fields
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoKeywords?: string;

  @IsOptional()
  @IsString()
  seoCanonicalUrl?: string;

  @IsOptional()
  @IsString()
  seoOgImage?: string;

  // Fields for tracking who updated the document
  @IsOptional()
  @IsString()
  updatedBy?: string; // userId

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAt?: Date;

  // New property to handle images marked for removal from the gallery
  // This will be a comma-separated string from the EJS form.
  @IsOptional()
  @IsString()
  removedGalleryImages?: string;
}
