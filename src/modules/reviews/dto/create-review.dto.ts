import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator"
import { ReviewStatus } from "../schemas/review.schema"

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  name: string

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
  rating: number

  @IsNotEmpty()
  @IsString()
  comment: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus

  @IsOptional()
  @IsString()
  tour?: string
}
