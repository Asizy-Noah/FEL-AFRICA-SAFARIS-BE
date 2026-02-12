// src/common/dtos/enquiry.dto.ts
import { IsNotEmpty, IsEmail, IsString, IsOptional, IsPhoneNumber } from 'class-validator';

export class CreateEnquiryDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsPhoneNumber('UG') // Assuming phone numbers are from Uganda, adjust if needed
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  travelDate?: string; // Storing as string from HTML date input

  @IsNotEmpty()
  @IsString() // Can be a number string or "6+"
  numberOfTravelers: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}