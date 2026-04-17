// src/modules/destinations/dto/create-destination.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsMongoId, IsArray } from "class-validator";
import { Transform } from 'class-transformer';

export class CreateDestinationDto {
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() description: string;
  @IsNotEmpty() @IsMongoId() country: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsMongoId({ each: true })
  categories?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}
