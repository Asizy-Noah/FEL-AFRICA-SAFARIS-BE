// update-hero-slide.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateHeroSlideDto } from './create-hero-slide.dto';

export class UpdateHeroSlideDto extends PartialType(CreateHeroSlideDto) {}