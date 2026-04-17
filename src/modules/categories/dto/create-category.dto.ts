// src/modules/categories/dto/create-category.dto.ts

import { IsArray, IsNotEmpty, IsOptional, IsString, IsMongoId } from "class-validator"; // Add IsMongoId
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
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    // If it's a single string from the form, wrap it in an array
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsMongoId({ each: true }) // Validates every ID in the array
  countries?: string[];


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