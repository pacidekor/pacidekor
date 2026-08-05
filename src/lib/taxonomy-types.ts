export type TaxonomyCategory = {
  id: string;
  label: string;
  image?: string;
  description?: string;
  sortOrder: number;
};

export type TaxonomySubcategory = {
  id: string;
  label: string;
  categoryId: string;
  sortOrder: number;
};

export type TaxonomyStore = {
  categories: TaxonomyCategory[];
  subcategories: TaxonomySubcategory[];
};
