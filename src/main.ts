// src/main.ts
import 'reflect-metadata';
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import session from "express-session";
import passport from "passport";
import flash from "connect-flash";
import expressLayouts from "express-ejs-layouts";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import crypto from "crypto"; // For generating a default secret 
import methodOverride from 'method-override';
import * as express from 'express';
// Import connect-mongo
import ConnectMongo from 'connect-mongo';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Enable proxy trust (important for production deployments behind reverse proxies)
  app.set("trust proxy", 1);

  // Set up EJS templating engine
  app.setBaseViewsDir(join(process.cwd(), "views"));
  app.setViewEngine("ejs");
  app.use(expressLayouts);
  app.set("layout", "layouts/public");

  // Get MongoDB URI from config service
  const mongoUri = configService.get<string>("MONGODB_URI");

  // --- Configure MongoDB Session Store ---
  // Ensure mongoUri is available before creating the store 
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in the environment variables.");
  }

  const MongoStore = ConnectMongo.create({
    mongoUrl: mongoUri,
    collectionName: 'sessions', // Optional: Name of the collection to store sessions
    // touchAfter: 24 * 3600 // Optional: Only update a session in the database once every 24 hours
  });

  // Session middleware (must come before passport initialization)
  app.use(
    session({
      secret:
        configService.get<string>("SESSION_SECRET") ||
        crypto.randomUUID(), // fallback to a secure random UUID
      resave: false, // Don't save session if unmodified
      saveUninitialized: false, // Don't create session until something stored
      store: MongoStore, // --- Use the MongoDB session store here ---
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week (adjust as needed)
        secure: false, 
        //secure: process.env.NODE_ENV === "production", // Only over HTTPS in production
        httpOnly: false, // Prevent access via JavaScript
        sameSite: "lax", // Helps mitigate CSRF
      },
    })
  );
  // --- End Session Store Configuration ---

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Recommended: removes properties not defined in the DTO
    forbidNonWhitelisted: true, // Recommended: throws error if non-whitelisted properties are sent
    transform: true, // Recommended: automatically transforms incoming payload to DTO instance
  }));

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Static files
  app.useStaticAssets(join(process.cwd(), "public"));

  // Serve files from the 'public/uploads' directory at the '/uploads' path
  app.useStaticAssets(join(process.cwd(), "public", "uploads"), {
    prefix: '/uploads', // Files in 'public/uploads' will be accessed via /uploads/filename.jpg
  });

  // Flash messages
  app.use(flash());

  // Middleware to pass user and flash messages to views
  app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.error = req.flash("error"); 
    // Ensure req.session is accessed safely
    res.locals.user = (req.session as any)?.user || null; // Cast req.session to any if needed for user property
    next();
  });

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json()); // Also good practice if you expect JSON bodies too

  app.use(methodOverride('_method'));
  

  // Enable this in production once verified
  // app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  // app.use(LoggerMiddleware);

  const port = configService.get<number>("PORT") || 3000;

  // --- IMPORTANT: Ensure app.listen() is called to start the server ---
  await app.listen(port, '0.0.0.0', () => {
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Accessible from network on: http://your_network_ip:${port}`);
  });
}
bootstrap();
