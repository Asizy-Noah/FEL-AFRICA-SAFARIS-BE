// src/modules/categories/dto/update-category.dto.ts

import { PartialType } from "@nestjs/mapped-types";
import { CreateCategoryDto } from "./create-category.dto";

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  // Any specific update-only fields can go here,
  // but for now, it inherits everything as optional from CreateCategoryDto.
}