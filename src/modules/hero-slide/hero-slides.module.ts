import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HeroSlidesController } from './hero-slides.controller';
import { HeroSlidesService } from './hero-slides.service';
import { HeroSlide, HeroSlideSchema } from './schemas/hero-slide.schema';
import { LocalStorageService } from "../google-cloud/local-storage.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HeroSlide.name, schema: HeroSlideSchema }]),
  ],
  controllers: [HeroSlidesController],
  providers: [
    HeroSlidesService, 
    LocalStorageService // Register it here as a provider
  ],
  exports: [HeroSlidesService]
})
export class HeroSlidesModule {}