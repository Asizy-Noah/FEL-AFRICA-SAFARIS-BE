import { PartialType } from "@nestjs/mapped-types";
import { CreateTourDto } from "./create-tour.dto";
import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateTourDto extends PartialType(CreateTourDto) {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    removedGalleryImages?: string[];
}