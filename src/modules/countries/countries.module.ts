// src/modules/countries/countries.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CountriesService } from "./countries.service";
import { CountriesController } from "./countries.controller";
import { Country, CountrySchema } from "./schemas/country.schema";
import { ToursModule } from "../tours/tours.module";
import { CategoriesModule } from "../categories/categories.module";
import { LocalStorageService } from "../google-cloud/local-storage.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
    // No change here for ToursModule, it's correctly imported
    ToursModule,
    // forwardRef here for CategoriesModule, as before
    forwardRef(() => CategoriesModule),
  ],
  controllers: [CountriesController],
  providers: [
    CountriesService,
    LocalStorageService, 
  ],
  exports: [CountriesService],
})
export class CountriesModule {} 