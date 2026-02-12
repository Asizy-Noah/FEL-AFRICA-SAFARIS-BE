// src/modules/tours/tours.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ToursService } from "./tours.service";
import { ToursController } from "./tours.controller";
import { Tour, TourSchema } from "./schemas/tour.schema";
import { CountriesModule } from "../countries/countries.module";
import { CategoriesModule } from "../categories/categories.module";
import { DestinationsModule } from "../destinations/destinations.module";
import { LocalStorageService } from "../google-cloud/local-storage.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tour.name, schema: TourSchema }]),
    forwardRef(() => CountriesModule),
    forwardRef(() => CategoriesModule),
    forwardRef(() => DestinationsModule),
  ],
  controllers: [ToursController],
  providers: [
    ToursService,
    LocalStorageService, 
  ],
  exports: [ToursService],
})
export class ToursModule {}