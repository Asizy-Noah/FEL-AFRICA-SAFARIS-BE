import { Controller, Get, Res, Header } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { Response } from 'express'; // Import Response from express

@Controller() // Use a root-level controller if you want /sitemap.xml
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Encoding', 'gzip') // Indicate that the content is gzipped
  async getSitemap(@Res() res: Response) {
    const sitemap = await this.sitemapService.generateSitemap();
    res.send(sitemap);
  }
}