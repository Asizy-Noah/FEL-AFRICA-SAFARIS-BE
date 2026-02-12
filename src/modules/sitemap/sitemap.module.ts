// src/modules/sitemap/sitemap.module.ts
import { Module } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { SitemapController } from './sitemap.controller';
import { ToursModule } from '../tours/tours.module'; // Import ToursModule
import { CountriesModule } from '../countries/countries.module'; // Import CountriesModule
import { BlogsModule } from '../blogs/blogs.module'; // Import BlogsModule

@Module({
  imports: [
    // Import the modules that export the services needed by SitemapService
    ToursModule,
    CountriesModule, // Assuming CountriesModule exports CountriesService
    BlogsModule,     // Assuming BlogsModule exports BlogsService
    // ConfigModule is already global, so no need to import it here
  ],
  providers: [SitemapService],
  controllers: [SitemapController],
  exports: [SitemapService],
})
export class SitemapModule {}