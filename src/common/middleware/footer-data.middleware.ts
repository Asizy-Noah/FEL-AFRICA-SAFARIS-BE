import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DestinationsService } from '../../modules/destinations/destinations.service';
import { PartnersService } from '../../modules/partners/partners.service';

@Injectable()
export class FooterDataMiddleware implements NestMiddleware {
  constructor(
    private readonly destinationsService: DestinationsService,
    private readonly partnersService: PartnersService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Fetch Top 10 Destinations
      const destinationsResult = await this.destinationsService.findAll();
      const topDestinations = (destinationsResult.data || [])
        .slice(0, 10)
        .sort((a, b) => a.name.localeCompare(b.name));

      // 2. Fetch All Partners 
      // If your service returns Partner[] directly, use it as is:
      const partnersResult = await this.partnersService.findAll();
      const footerPartners = Array.isArray(partnersResult) ? partnersResult : [];

      // 3. Attach to locals
      res.locals.footerDestinations = topDestinations;
      res.locals.footerPartners = footerPartners;

    } catch (error) {
      console.error('Error fetching footer data:', error);
      res.locals.footerDestinations = [];
      res.locals.footerPartners = []; 
    }
    next();
  }
}