import { Injectable } from '@nestjs/common';
import { SitemapStream, streamToPromise } from 'sitemap';
import { createGzip } from 'zlib';
import { ConfigService } from '@nestjs/config';
import { ToursService } from '../tours/tours.service';
import { CountriesService } from '../countries/countries.service';
import { BlogsService } from '../blogs/blogs.service';

@Injectable()
export class SitemapService {
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly toursService: ToursService,
    private readonly countriesService: CountriesService,
    private readonly blogService: BlogsService,
  ) {
    this.baseUrl = this.configService.get<string>('BASE_URL');

    if (!this.baseUrl) {
      console.error('CRITICAL ERROR: BASE_URL environment variable is not set.');
    }
  }

  async generateSitemap(): Promise<Buffer> {
    const smStream = new SitemapStream({ hostname: this.baseUrl });
    const pipeline = smStream.pipe(createGzip());

    // 1. Add static pages
    smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    smStream.write({ url: '/about', changefreq: 'monthly', priority: 0.8 });
    smStream.write({ url: '/contact', changefreq: 'monthly', priority: 0.7 });
    smStream.write({ url: '/enquiry', changefreq: 'monthly', priority: 0.7 });
    smStream.write({ url: '/privacy-policy', changefreq: 'yearly', priority: 0.5 });
    smStream.write({ url: '/terms-conditions', changefreq: 'yearly', priority: 0.5 });

    // 2. Add dynamic pages

    // --- Safari Tour Pages ---
    try {
      const tours = await this.toursService.findFeatured();
      tours.forEach((tour: any) => {
        smStream.write({
          url: `/tours/${tour.slug}`,
          changefreq: 'weekly',
          priority: 0.9,
          ...(tour.updatedAt && { lastmod: new Date(tour.updatedAt).toISOString() }),
        });
      });
    } catch (error) {
      console.error('Error fetching tours for sitemap:', error);
    }

    // --- Destination Pages ---
    try {
      const countries = await this.countriesService.findAllForSitemap();
      countries.forEach((destination: any) => {
        smStream.write({
          url: `/countries/${destination.slug}`,
          changefreq: 'monthly',
          priority: 0.8,
          ...(destination.updatedAt && { lastmod: new Date(destination.updatedAt).toISOString() }),
        });
      });
    } catch (error) {
      console.error('Error fetching destinations for sitemap:', error);
    }

    // --- Blog Post Pages ---
    try {
      const blogPosts = await this.blogService.findPublished();
      blogPosts.forEach((post: any) => {
        smStream.write({
          url: `/blogs/${post.slug}`,
          changefreq: 'weekly',
          priority: 0.7,
          ...(post.updatedAt && { lastmod: new Date(post.updatedAt).toISOString() }),
        });
      });
    } catch (error) {
      console.error('Error fetching blog posts for sitemap:', error);
    }

    smStream.end();
    return streamToPromise(pipeline);
  }
}