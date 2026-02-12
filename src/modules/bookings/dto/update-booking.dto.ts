import { PartialType } from "@nestjs/mapped-types"
import { CreateBookingDto } from "./create-booking.dto"
import { IsOptional, IsString } from 'class-validator';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
    @IsOptional()
  @IsString()
  updatedBy?: string;
}
