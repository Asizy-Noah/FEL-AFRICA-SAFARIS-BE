// create-partner.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatePartnerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  logo?: string;
}