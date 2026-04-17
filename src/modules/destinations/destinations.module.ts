import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DestinationsService } from './destinations.service';
import { DestinationsController } from './destinations.controller';
import { Destination, DestinationSchema } from './schemas/destination.schema';
import { CountriesModule } from '../countries/countries.module';
import { CategoriesModule } from '../categories/categories.module';
import { LocalStorageService } from '../google-cloud/local-storage.service';
import { ToursModule } from '../tours/tours.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Destination.name, schema: DestinationSchema }]),
    forwardRef(() => CountriesModule),
    forwardRef(() => CategoriesModule),
    forwardRef(() => ToursModule),
  ],
  controllers: [DestinationsController],
  providers: [DestinationsService, LocalStorageService],
  exports: [DestinationsService],
})
export class DestinationsModule {}
