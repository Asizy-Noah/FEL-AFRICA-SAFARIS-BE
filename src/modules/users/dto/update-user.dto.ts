// src/modules/users/dto/update-user.dto.ts

import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator" // Removed MinLength
import { UserRole, UserStatus } from "../schemas/user.schema" // Add this import

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty() // Can't be empty if provided
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string 

  // REMOVED: password?: string

  @IsOptional()
  @IsString()
  phoneNumber?: string

  @IsOptional()
  @IsString()
  companyName?: string

  @IsOptional()
  @IsUrl({}, { message: 'Company Website must be a valid URL' })
  companyWebsite?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole
}