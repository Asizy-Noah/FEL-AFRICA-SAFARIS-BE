import { IsNotEmpty, IsOptional, IsString, IsArray } from "class-validator"

export class CreateCountryDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @IsString()
  code: string

  @IsNotEmpty()
  @IsString()
  slug: string

  @IsNotEmpty()
  @IsString()
  overview: string

  @IsNotEmpty()
  @IsString()
  description: string

  @IsOptional()
  @IsString()
  summary?: string

  @IsOptional()
  @IsString()
  coverImage?: string

  @IsOptional()
  @IsArray()
  galleryImages?: string[]

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
  seoCanonicalUrl?: string

  @IsOptional()
  @IsString()
  seoOgImage?: string
}
