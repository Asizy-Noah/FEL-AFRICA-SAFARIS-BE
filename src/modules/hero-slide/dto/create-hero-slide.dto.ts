// create-hero-slide.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHeroSlideDto {
  @IsNotEmpty() @IsString() title: string;
  @IsOptional() @IsString() titleEnd?: string;
  @IsOptional() @IsString() caption?: string;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  order?: number;

  @IsOptional() photo?: string;
}

