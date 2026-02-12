export class CreateDestinationDto {
  name: string;
  coverImage?: string;
  image?: string;
  description: string;
  country: string;
  categories?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}
