export class UpdateDestinationDto {
  name?: string;
  coverImage?: string | null;
  image?: string | null;
  description?: string;
  country?: string;
  categories?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  removedGalleryImages?: string; // placeholder if needed
}
