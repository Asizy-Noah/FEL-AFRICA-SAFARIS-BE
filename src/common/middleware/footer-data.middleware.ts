// src/common/middleware/footer-data.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CountriesService } from '../../modules/countries/countries.service'; // Adjust path


@Injectable()
export class FooterDataMiddleware implements NestMiddleware {
  constructor(private readonly countriesService: CountriesService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Corrected: `limit` should likely be a number if your service expects it as such.
      // If your `findAll` method's `options` interface strictly defines `limit: string`,
      // you would change `limit: 10` to `limit: '10'`.
      // Assuming `findAll` can handle a number for limit, the issue is more likely in your `findAll`'s interface.
      // For now, let's cast it to string to match the error, but check your CountriesService's interface for `FindAllOptions`.
      const countriesResult = await this.countriesService.findAll({
        limit: '10', // Changed to string '10' to resolve TS2322. Verify if your CountriesService expects number or string.
      });

      // Corrected: Access the `data` array from the paginated response
      const popularFooterCountries = countriesResult.data;

      // Corrected: Only sort if the data array exists and has elements
      if (popularFooterCountries && Array.isArray(popularFooterCountries)) {
        // Sort alphabetically by name
        popularFooterCountries.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Ensure it's an empty array if no data or invalid data is returned
        res.locals.popularFooterCountries = [];
        next(); // Exit early if no data to prevent further errors
        return;
      }

      // Make the data available to all templates via res.locals
      res.locals.popularFooterCountries = popularFooterCountries;
    } catch (error) {
      console.error('Error fetching footer countries in middleware:', error);
      res.locals.popularFooterCountries = []; // Provide an empty array on error
    }
    next(); // Pass control to the next middleware or route handler
  }
}