import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { BookingsService } from "./bookings.service"
import { BookingsController } from "./bookings.controller"
import { Booking, BookingSchema } from "./schemas/booking.schema"
import { MailModule } from "../mail/mail.module"
import { ToursModule } from "../tours/tours.module" // <--- ADD THIS IMPORT
import { UsersModule } from "../users/users.module" // <--- ADD THIS IMPORT

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    MailModule,
    ToursModule, // <--- ADD ToursModule here
    UsersModule, // <--- ADD UsersModule here
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}