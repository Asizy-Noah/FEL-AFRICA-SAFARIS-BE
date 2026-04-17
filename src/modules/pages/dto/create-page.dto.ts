// src/modules/pages/dto/create-page.dto.ts
import { Transform, Type } from "class-transformer";
import { 
  IsArray, IsEnum, IsNotEmpty, IsOptional, 
  IsString, ValidateNested 
} from "class-validator";
import { PageStatus, PageType } from "../schemas/page.schema";

export class PageContentBlockDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class CreatePageDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsEnum(PageType)
  pageType: PageType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageContentBlockDto)
  @IsOptional()
  @Transform(({ value }) => {
    // FIX: Parse the JSON string sent by the frontend back into an array
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  contentBlocks: PageContentBlockDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  removedGalleryImages?: string; // Add this line

  @IsOptional()
  galleryImages?: string[];

  @IsOptional()
  @IsEnum(PageStatus)
  status?: PageStatus;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    return value;
  })
  seoKeywords?: string[];

  @IsOptional()
  @IsString()
  seoCanonicalUrl?: string;

  @IsOptional()
  @IsString()
  seoOgImage?: string;
}