import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator"
import { BookingStatus } from "../schemas/booking.schema"

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  fullName: string

  @IsNotEmpty()
  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  phoneNumber?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  tour?: string

  @IsOptional()
  @IsString()
  customTourRequest?: string

  @IsOptional()
  @IsDateString()
  travelDate?: Date

  @IsOptional()
  @IsNumber()
  @Min(0)
  numberOfAdults?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  numberOfChildren?: number

  @IsOptional()
  @IsString()
  specialRequirements?: string

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus 

  @IsOptional()
  @IsString()
  adminNotes?: string

  @IsOptional()
  @IsString()
  assignedTo?: string
}
