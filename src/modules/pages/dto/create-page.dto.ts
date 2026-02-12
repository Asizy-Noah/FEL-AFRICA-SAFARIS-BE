// src/modules/pages/dto/create-page.dto.ts
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type, Transform } from "class-transformer"; // Import Transform
import { PageStatus, PageType } from "../schemas/page.schema";

// --- PageContentBlockDto: REMOVED 'image' field ---
export class PageContentBlockDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  // REMOVED: @IsOptional() @IsString() image?: string;
  // REMOVED: @IsOptional() @IsUrl() videoUrl?: string;
}

// --- Main Create Page DTO ---
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
  contentBlocks: PageContentBlockDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
      return value.split(',').map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
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