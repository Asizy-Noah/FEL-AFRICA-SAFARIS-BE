import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { BlogStatus } from "../schemas/blog.schema";
import { Transform, Type } from 'class-transformer';

export class CreateBlogDto {
  @IsNotEmpty() 
  @IsString() 
  title: string;

  @IsOptional() 
  @IsString() 
  slug: string; // If auto-generated, keep as optional

  @IsOptional() 
  @IsString() 
  excerpt?: string;

  // This allows the nested "sections[0][type]" fields from your EJS form
  @IsArray() 
  @IsOptional() 
  sections?: any[]; 

  @IsOptional() 
  @IsString() 
  coverImage?: string;

  @IsOptional() 
  @IsArray() 
  @IsString({ each: true }) 
  tags?: string[];

  @IsOptional() 
  @IsEnum(BlogStatus) 
  status?: BlogStatus;

  @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value].filter(Boolean)))
    countries: string[];
  
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => (Array.isArray(value) ? value : [value].filter(Boolean)))
    categories: string[];

  // SEO Fields (Matches EJS "name" attributes)
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
  seoOgImage?: string;

  @IsOptional() 
  @IsString() 
  seoCanonicalUrl?: string;
}