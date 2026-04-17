import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, IsDateString, IsUrl } from "class-validator"
import { ReviewStatus } from "../schemas/review.schema"
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  title: string // Matches Schema

  @IsNotEmpty()
  @IsString()
  clientName: string // Matches Schema (was 'name' in your old DTO)

  @IsNotEmpty()
  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  country?: string

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number

  @IsNotEmpty()
  @IsString()
  comment: string

  @IsOptional()
  @IsString()
  source?: string // E.g., 'google'

  @IsNotEmpty()
  @IsUrl()
  externalLink: string

  @IsNotEmpty()
  @IsDateString()
  reviewDate: Date

  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus

  @IsOptional()
  @IsString()
  tour?: string

  @IsOptional()
  @IsString()
  response?: string
}