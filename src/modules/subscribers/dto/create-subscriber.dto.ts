import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CreateSubscriberDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsNotEmpty()
  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  phoneNumber?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
