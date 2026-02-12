import { Module, NestModule, MiddlewareConsumer, RequestMethod } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { MongooseModule } from "@nestjs/mongoose"
import { ServeStaticModule } from "@nestjs/serve-static"
import { join } from "path"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { AuthModule } from "./modules/auth/auth.module"
import { UsersModule } from "./modules/users/users.module"
import { CountriesModule } from "./modules/countries/countries.module"
import { CategoriesModule } from "./modules/categories/categories.module"
import { ToursModule } from "./modules/tours/tours.module"
import { DestinationsModule } from "./modules/destinations/destinations.module"
import { BlogsModule } from "./modules/blogs/blogs.module"
import { ReviewsModule } from "./modules/reviews/reviews.module"
import { SubscribersModule } from "./modules/subscribers/subscribers.module"
import { PagesModule } from "./modules/pages/pages.module"
import { BookingsModule } from "./modules/bookings/bookings.module"
import { MailModule } from "./modules/mail/mail.module"
import { SitemapModule } from './modules/sitemap/sitemap.module';
import { DashboardModule } from "./modules/dashboard/dashboard.module"
import { HeaderDataMiddleware } from './common/middleware/header-data.middleware'; 
import { FooterDataMiddleware } from './common/middleware/footer-data.middleware';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI") || "mongodb://localhost/roads-of-adventure",
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "public"),
    }),
    AuthModule,
    UsersModule,
    CountriesModule,
    CategoriesModule,
    DestinationsModule,
    ToursModule,
    BlogsModule,
    ReviewsModule,
    SubscribersModule,
    PagesModule,
    BookingsModule,
    MailModule,
    DashboardModule,
    SitemapModule,
  ], 
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HeaderDataMiddleware)
      .forRoutes(
        { path: '*', method: RequestMethod.GET }, // Apply to all GET requests
        // You might refine this to only public-facing routes if dashboard routes don't need it
        // e.g., { path: '/countries/*', method: RequestMethod.GET },
        // { path: '/', method: RequestMethod.GET },
        // { path: '/tours/*', method: RequestMethod.GET }, etc.
      );

      consumer
      .apply(FooterDataMiddleware) // Apply the new footer middleware
      .forRoutes('*'); // Apply to all routes
  }
}
