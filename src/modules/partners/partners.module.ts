import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { Partner, PartnerSchema } from './schemas/partners.schema';
import { LocalStorageService } from "../google-cloud/local-storage.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Partner.name, schema: PartnerSchema }]),
  ],
  controllers: [PartnersController],
  providers: [
    PartnersService, 
    LocalStorageService // Register it here as a provider
  ],
  exports: [PartnersService],
})
export class PartnersModule {}