// src/modules/pages/pages.module.ts
import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { PagesService } from "./pages.service"
import { PagesController } from "./pages.controller"
import { Page, PageSchema } from "./schemas/page.schema"
import { LocalStorageService } from "../google-cloud/local-storage.service"; 

@Module({
  imports: [MongooseModule.forFeature([{ name: Page.name, schema: PageSchema }])],
  controllers: [PagesController],
  providers: [
    PagesService,
    LocalStorageService,
  ],
  exports: [PagesService],
})
export class PagesModule {}