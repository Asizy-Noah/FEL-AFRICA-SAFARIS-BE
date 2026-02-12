// src/modules/categories/dto/create-category.dto.ts

import { IsNotEmpty, IsOptional, IsString, IsMongoId } from "class-validator"; // Add IsMongoId
import { Transform } from 'class-transformer'; 

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string; // This will be the path to the uploaded image

  /// New field: Country ID
  @Transform(({ value }) => (value === '' ? null : value)) // <--- ADD THIS LINE
  @IsOptional()
  @IsMongoId()
  country?: string | null; // Allow null as a valid type


  // SEO Fields (add these to align with the form)
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsString()
  seoKeywords?: string;
}