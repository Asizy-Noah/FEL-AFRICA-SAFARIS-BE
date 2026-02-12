import { Controller, Get, Render, Param, Query, Res, Post, Body, NotFoundException, } from "@nestjs/common"
import { Response } from "express"
import { AppService } from "./app.service"
import { ToursService, TourSearchOptions } from "./modules/tours/tours.service"
import { CountriesService } from "./modules/countries/countries.service"
import { CategoriesService } from "./modules/categories/categories.service"
import { BlogsService } from "./modules/blogs/blogs.service"
import { ReviewsService } from "./modules/reviews/reviews.service"
import { PagesService } from "./modules/pages/pages.service"
import { SubscribersService } from "./modules/subscribers/subscribers.service"
import { BlogFindAllOptions } from "./modules/blogs/interfaces/blog-find-all-options.interface";
import { BlogStatus } from "./modules/blogs/schemas/blog.schema";
import { PageType } from "./modules/pages/schemas/page.schema"; 
import { TourStatus } from "./modules/tours/schemas/tour.schema";
import { MailService } from "./modules/mail/mail.service"
import { CreateEnquiryDto } from "./modules/enquiry/dtos/enquiry.dto";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly toursService: ToursService,
    private readonly countriesService: CountriesService,
    private readonly categoriesService: CategoriesService,
    private readonly blogsService: BlogsService,
    private readonly reviewsService: ReviewsService,
    private readonly pagesService: PagesService,
    private readonly subscribersService: SubscribersService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  @Render("public/index")
  async getHomePage(@Query('page') pageQuery: string = '1') { // Changed 'page' to 'pageQuery' to avoid conflict with `page` inside findAll return
    const page = parseInt(pageQuery, 10);
    const limit = 4; // Display 4 blogs on the homepage

    // Fetch About Us page
    const aboutUsPage = await this.pagesService.findOneByType(PageType.ABOUT); 
    
  
    // Fetch actual featured tours using findFeatured method
    const featuredTours = await this.toursService.findFeatured();
    
    
  
    // Fetch all countries for destinations
    const result = await this.countriesService.findAll();
    const countries = Array.isArray(result) ? result : result.data ?? [];

    
    // Fetch approved reviews (if used on the homepage)
    const reviews = await this.reviewsService.findApproved();

    // --- FIX: Pass queryOptions object to blogsService.findAll ---
    const { blogs, totalBlogs, currentPage, totalPages } = await this.blogsService.findAll({
      page: page,
      limit: limit,
      sortBy: 'newest', // Ensure you get the latest blogs
      status: BlogStatus.VISIBLE, // <--- CHANGED FROM 'published' to BlogStatus.VISIBLE
    });

    return {
      title: "Home",
      aboutUsPage,
      featuredTours,
      countries,
      blogs,
      reviews,
      currentPage, // Pass these directly from the service response
      totalPages,
      layout: "layouts/public",
      seo: {
        description: aboutUsPage.seoDescription,
        keywords: aboutUsPage.seoKeywords,
        canonicalUrl: aboutUsPage.seoCanonicalUrl,
        ogImage: aboutUsPage.seoOgImage || aboutUsPage.coverImage,
    },
    };
  }

  @Get('page/:slug')
  @Render('public/page')
  async getPage(@Param('slug') slug: string) {
    const page = await this.pagesService.findBySlug(slug);

    return {
      title: `${page.title}`,
      page,
      layout: 'layouts/public',
      seo: {
        title: page.seoTitle || `${page.title} `,
        description: page.seoDescription || page.description,
        keywords: page.seoKeywords,
        canonicalUrl: page.seoCanonicalUrl,
        ogImage: page.seoOgImage || page.coverImage,
      },
    };
  }

  @Get("subscribe")
  async subscribe(@Query() query, @Res() res: Response) {
    try {
      await this.subscribersService.create({
        name: query.name,
        email: query.email,
        phoneNumber: query.phone,
      })

      return res.redirect(query.redirect || "/?subscribed=true")
    } catch (error) {
      return res.redirect(query.redirect || "/?subscribed=false")
    }
  }

  @Get('unsubscribe')
  @Render('public/unsubscribe')
  async getUnsubscribePage(@Query('email') email: string) {
    return {
      title: 'Unsubscribe - Feel Africa Safaris',
      email,
      layout: 'layouts/public',
    };
  }

  @Get("unsubscribe/confirm")
  async unsubscribe(@Query('email') email: string, @Res() res: Response) {
    try {
      // Find subscriber by email and delete
      const subscribers = await this.subscribersService.findAll({ search: email })

      if (subscribers.length > 0) {
        await this.subscribersService.remove(subscribers[0]._id)
      }

      return res.redirect("/?unsubscribed=true")
    } catch (error) {
      return res.redirect("/?unsubscribed=false")
    }
  }

  // --- NEW: GET route to render the enquiry page ---
  @Get('enquiry')
  @Render('public/enquiry') // Assuming your EJS file is public/enquiry.ejs
  getEnquiryPage() {

    const seoDescription = "Send us your inquiry at Feel Africa Safaris for unforgettable safari experiences in Uganda, Kenya, Tanzania, and Rwanda. Get a custom quote for your dream adventure with Feel Africa Safaris.";
    const seoKeywords = "safari inquiry, custom safari quote, contact safari, uganda safari inquiry, kenya safari inquiry, tanzania safari inquiry, rwanda safari inquiry, feel africa safaris contact";
    const canonicalUrl = "https://www.feelafricasafaris.com/enquiry"; 

    return {
      title: "Enquiry",
      layout: "layouts/public",
      seo: {
        description: seoDescription,
        keywords: seoKeywords,
        canonicalUrl: canonicalUrl,
      },
    };
  }


  // --- NEW: POST route to handle enquiry form submission ---
  @Post('enquiry')
  async submitEnquiry(@Body() createEnquiryDto: CreateEnquiryDto, @Res() res: Response) {
    try {
      
      await this.mailService.sendEnquiryToAdmin(createEnquiryDto);

      return res.redirect('/enquiry?success=true');
    } catch (error) {
      console.error('Error submitting enquiry:', error);
      // Redirect with an error message
      return res.redirect('/enquiry?success=false');
    }
  }

  @Get('impact')
  @Render('public/impact')
  async getImpactPage() { // Make it async
    // Fetch the page with type COMMUNITY
    const impactPage = await this.pagesService.findOneByType(PageType.COMMUNITY);

    // If the page is not found, you might want to throw an error or redirect
    if (!impactPage) {
      // You can either throw a NotFoundException which NestJS will handle
      // or redirect to a 404 page, or render a generic "page not found" view.
      throw new NotFoundException('Impact page not found.');
      // Or, for a user-friendly redirect:
      // return res.redirect('/404'); // Assuming you have a 404 page
    }

    // Pass the page data to the EJS template
    return {
      title: impactPage.seoTitle || `${impactPage.title}`,
      impactPage, // Pass the entire page object
      layout: "layouts/public",
      seo: {
        title: impactPage.seoTitle || `${impactPage.title}`,
        description: impactPage.seoDescription || impactPage.description,
        keywords: impactPage.seoKeywords,
        canonicalUrl: impactPage.seoCanonicalUrl,
        ogImage: impactPage.seoOgImage || impactPage.coverImage,
      },
    };
  }

  // --- NEW: GET route to render the Terms and Conditions page ---
  @Get('terms')
  @Render('public/terms') // Assuming your EJS file is public/terms.ejs
  async getTermsPage() { // Make it async
    // Fetch the page with type TERMS
    const termsPage = await this.pagesService.findOneByType(PageType.TERMS);

    // If the page is not found, you might want to throw an error or redirect
    if (!termsPage) {
      throw new NotFoundException('Terms and Conditions page not found.');
    }

    // Pass the page data to the EJS template
    return {
      title: termsPage.seoTitle || `${termsPage.title}`,
      termsPage, // Pass the entire page object
      layout: "layouts/public",
      seo: {
        title: termsPage.seoTitle || `${termsPage.title}`,
        description: termsPage.seoDescription || termsPage.description,
        keywords: termsPage.seoKeywords,
        canonicalUrl: termsPage.seoCanonicalUrl,
        ogImage: termsPage.seoOgImage || termsPage.coverImage,
      },
    };
  }

  @Get('privacy-policy')
  @Render('public/privacy-policy') // Assuming your EJS file is public/privacy-policy.ejs
  async getPrivacyPolicyPage() { // Make it async
    // Fetch the page with type PRIVACY
    const privacyPage = await this.pagesService.findOneByType(PageType.PRIVACY);

    // If the page is not found, you might want to throw an error or redirect
    if (!privacyPage) {
      throw new NotFoundException('Privacy Policy page not found.');
    }

    // Pass the page data to the EJS template
    return {
      title: privacyPage.seoTitle || `${privacyPage.title}`,
      privacyPage, // Pass the entire page object
      layout: "layouts/public",
      seo: {
        title: privacyPage.seoTitle || `${privacyPage.title}`,
        description: privacyPage.seoDescription || privacyPage.description,
        keywords: privacyPage.seoKeywords,
        canonicalUrl: privacyPage.seoCanonicalUrl,
        ogImage: privacyPage.seoOgImage || privacyPage.coverImage,
      },
    };
  }

  
  @Get('about')
  @Render('public/about') // Assuming your EJS file is public/about.ejs
  getaboutPage() {

    const seoDescription = "Learn about Feel Africa Safaris, your trusted partner for authentic and unforgettable safari adventures across Uganda, Kenya, Tanzania, Rwanda and many other African countries.";
    const seoKeywords = "about us, feel africa safaris, company profile, africa safari company, uganda safaris, kenya safaris, tanzania safaris, rwanda safaris, safari experts";
    const canonicalUrl = "https://www.feelafricasafaris.com/about";

    return {
      title: "About Us",
      layout: "layouts/public",
      seo: {
        description: seoDescription,
        keywords: seoKeywords,
        canonicalUrl: canonicalUrl,
      },
    };
  }

  @Get('search-packages')
  @Render('public/search-results') // You will create this EJS file
  async searchPackages(
    @Query('countryId') countryId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('days') days?: string, // Comes as string from query, convert to number
    @Query('page') page: string = '1', // For pagination on search results
  ) {
    const parsedDays = days ? parseInt(days, 10) : undefined;
    const parsedPage = parseInt(page, 10);
    const limit = 9; // Number of tours per page on search results

    // Prepare search options for the service
    const searchOptions: TourSearchOptions = {
      countryId: countryId || undefined, // Pass undefined if empty string
      categoryId: categoryId || undefined, // Pass undefined if empty string
      days: parsedDays,
      page: parsedPage,
      limit: limit,
    };

    try {
      const { tours, totalTours, page: currentPage, totalPages } = await this.toursService.searchTours(searchOptions);

      // Fetch all countries again to re-populate the destination dropdown if needed
      const countriesResult = await this.countriesService.findAll();
      const allCountries = Array.isArray(countriesResult) ? countriesResult : countriesResult.data ?? [];


      // If you want to show selected filters in the rendered form on search results page
      let selectedCountry = null;
      let selectedCategory = null;
      if (countryId) {
        selectedCountry = await this.countriesService.findOne(countryId); // Assuming you have findOneById
      }
      if (categoryId) {
        selectedCategory = await this.categoriesService.findOne(categoryId); // Assuming you have findOneById
      }


      return {
        title: "Search Results",
        tours,
        totalTours,
        currentPage,
        totalPages,
        allCountries, // Pass all countries for potential re-population of search form filters
        selectedCountry, // Pass selected country object
        selectedCategory, // Pass selected category object
        selectedDays: parsedDays, // Pass selected days number
        layout: 'layouts/public',
      };
    } catch (error) {
      console.error('Error during package search:', error);
      // Handle errors: render an error page or an empty results page with a message
      return {
        title: "Search Results - Error",
        tours: [],
        totalTours: 0,
        currentPage: 1,
        totalPages: 0,
        allCountries: [], // Pass empty array if error
        selectedCountry: null,
        selectedCategory: null,
        selectedDays: undefined,
        errorMessage: 'An error occurred while searching for packages. Please try again.',
        layout: 'layouts/public',
      };
    }
  }
}
