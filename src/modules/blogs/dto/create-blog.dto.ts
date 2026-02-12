import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator"
import { BlogStatus } from "../schemas/blog.schema"

export class CreateBlogDto {
  @IsNotEmpty()
  @IsString()
  title: string

  // Slug is not directly in the form; it's usually generated from the title.
  // If you manually generate it, keep it @IsNotEmpty().
  // If generated in the backend, it could be removed from DTO or made @IsOptional().
  // For now, assuming it's generated, but keeping @IsNotEmpty() if you send it from frontend (e.g. hidden field)
  @IsNotEmpty()
  @IsString()
  slug: string

  @IsOptional()
  @IsString()
  excerpt?: string

  @IsNotEmpty()
  @IsString()
  content: string


  @IsOptional()
  @IsString()
  coverImage?: string // This will receive the path from the uploaded 'featuredImage'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  // Updated enum type
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus // Now allows 'visible' or 'hidden'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[] // Not in form, but kept for consistency with schema

  // SEO fields - No changes needed, they match
  @IsOptional()
  @IsString()
  seoTitle?: string

  @IsOptional()
  @IsString()
  seoDescription?: string

  @IsOptional()
  @IsString()
  seoKeywords?: string

  @IsOptional()
  @IsString()
  seoOgImage?: string
}