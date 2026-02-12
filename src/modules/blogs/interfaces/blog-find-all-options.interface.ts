export interface BlogFindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  status?: string; // e.g., 'published', 'draft', 'all'
  author?: string; // ObjectId of author
  category?: string; // ObjectId of category
  country?: string; // ObjectId of country
  tag?: string; // A specific tag
  // Add any other dynamic filters you expect
  [key: string]: any; // Allows for dynamic properties like $or if needed
}