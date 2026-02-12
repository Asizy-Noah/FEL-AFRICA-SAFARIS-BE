import { Injectable } from '@nestjs/common';
import { SitemapStream, streamToPromise, SitemapItemLoose } from 'sitemap';
import { createGzip } from 'zlib';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { ToursService } from '../tours/tours.service'; // Adjust path
import { CountriesService } from '../countries/countries.service'; // Adjust path
import { BlogsService } from '../blogs/blogs.service'; // Adjust path
import { Tour } from '../tours/schemas/tour.schema'; // Adjust this path and type name
import { Country } from '../countries/schemas/country.schema'; // Adjust this path and type name
import { Blog } from '../blogs/schemas/blog.schema'; // Adjust this path and type name


@Injectable()
export class SitemapService {
  private readonly baseUrl: string; // Declare as string, initialized in constructor

  constructor(
    private readonly configService: ConfigService, // Inject ConfigService
    private readonly toursService: ToursService,
    private readonly countriesService: CountriesService, // Corrected parameter name
    private readonly blogService: BlogsService,
    // Add any other services that provide content for your sitemap 
  ) {
    // Get the BASE_URL from the environment variables
    this.baseUrl = this.configService.get<string>('BASE_URL');

    // Add a basic check to ensure the base URL is set
    if (!this.baseUrl) {
      // Log an error or throw an exception if BASE_URL is not configured
      console.error('CRITICAL ERROR: BASE_URL environment variable is not set. Please check your .env file.');
      // Depending on your application's robustness, you might want to throw an error
      // throw new Error('BASE_URL environment variable is not set.');
    }
  }

  async generateSitemap(): Promise<Buffer> {
    const smStream = new SitemapStream({ hostname: this.baseUrl });
    const pipeline = smStream.pipe(createGzip());

    // 1. Add static pages:
    // Ensure these also use the WWW domain implicitly via baseUrl
    smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    smStream.write({ url: '/about', changefreq: 'monthly', priority: 0.8 });
    smStream.write({ url: '/contact', changefreq: 'monthly', priority: 0.7 });
    smStream.write({ url: '/enquiry', changefreq: 'monthly', priority: 0.7 }); // Added your enquiry page
    smStream.write({ url: '/privacy-policy', changefreq: 'yearly', priority: 0.5 }); // Example static page
    smStream.write({ url: '/terms-conditions', changefreq: 'yearly', priority: 0.5 }); // Example static page


    // 2. Add dynamic pages from your services:

    // --- Safari Tour/Package Pages ---
    try {
      // Removed explicit cast 'as Tour[]' because importing the correct type
      // should make the return type of findFeatured() align automatically.
      const tours = await this.toursService.findFeatured(); // Assumed method to get all public tours
      tours.forEach(tour => {
        smStream.write({
          url: `/tours/${tour.slug}`, // Assuming you have a 'slug' field for clean URLs
          changefreq: 'weekly', // Or 'monthly' if tour details change less often
          priority: 0.9,
          // FIX: Conditionally add lastmod if tour.updatedAt exists
          ...(tour.updatedAt && { lastmod: new Date(tour.updatedAt).toISOString() }),
        });
      });
    } catch (error) {
      console.error('Error fetching tours for sitemap:', error);
      // Decide how to handle this error: log, skip, etc.
    }

    // --- Destination Pages ---
    try {
      // FIX: Call the new findAllForSitemap method which returns Country[] directly
      const countries = await this.countriesService.findAllForSitemap(); // Changed from findAll()
      countries.forEach(destination => {
        smStream.write({
          url: `/countries/${destination.slug}`,
          changefreq: 'monthly',
          priority: 0.8,
          // FIX: Conditionally add lastmod if destination.updatedAt exists
          ...(destination.updatedAt && { lastmod: new Date(destination.updatedAt).toISOString() }),
        });
      });
    } catch (error) {
      console.error('Error fetching destinations for sitemap:', error);
    }

    // --- Blog Post Pages ---
    try {
      // Removed explicit cast 'as Blog[]' because importing the correct type
      // should make the return type of findPublished() align automatically.
      const blogPosts = await this.blogService.findPublished(); // Assumed method
      blogPosts.forEach(post => {
        smStream.write({
          url: `/blog/${post.slug}`,
          changefreq: 'weekly', // Or 'monthly' depending on how often you update
          priority: 0.7,
          // FIX: Conditionally add lastmod if post.updatedAt exists
          ...(post.updatedAt && { lastmod: new Date(post.updatedAt).toISOString() }),
        });
      });
    } catch (error) {
      console.error('Error fetching blog posts for sitemap:', error);
    }

    // Ensure all data has been pushed to the stream
    smStream.end();

    // Convert the stream to a promise and return the gzipped sitemap buffer
    return streamToPromise(pipeline);
  }
}
