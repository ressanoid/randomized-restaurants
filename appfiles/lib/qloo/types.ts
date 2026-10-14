/**
 * Qloo Taste API domain types.
 * Only the fields this app consumes are modelled; Qloo returns more.
 *
 * Note: Qloo types several single-value fields inconsistently — sometimes a
 * plain string/number, sometimes a tag-like object. Use `QlooLabel` and the
 * normalisers in `query.ts` rather than trusting the raw shape.
 */

export interface QlooImage {
  url: string;
}

export interface QlooLocation {
  lat: number;
  lon: number;
  geohash?: string;
}

export interface QlooTag {
  id: string;
  name: string;
  type: string;
}

export interface QlooTaggable {
  id?: string;
  name?: string;
  type?: string;
}

export type QlooLabel = string | QlooTaggable;

export interface QlooLocalityArea {
  name?: string;
  place?: string;
}

export interface QlooLocality {
  city?: QlooLocalityArea;
  neighborhood?: QlooLocalityArea;
  state?: QlooLocalityArea;
  country?: QlooLocalityArea;
}

/** Shape of `properties` on a Qloo place (restaurant) entity. */
export interface QlooPlaceProperties {
  description?: string;
  short_description?: string;
  image?: QlooImage;
  images?: QlooImage[];
  address?: string;
  neighborhood?: string;
  locality?: QlooLocality;
  business_rating?: number;
  price_level?: number | string | QlooTaggable;
  primary_genre?: QlooLabel;
  cuisine_description?: QlooLabel;
}

/** Shape of `properties` on a Qloo movie entity. */
export interface QlooMovieProperties {
  description?: string;
  image?: QlooImage;
  images?: QlooImage[];
  release_year?: number;
}

export interface QlooEntity {
  name: string;
  entity_id: string;
  type?: string;
  subtype?: string;
  popularity?: number;
  location?: QlooLocation;
  tags?: QlooTag[] | null;
  properties?: (QlooPlaceProperties & QlooMovieProperties) | null;
}

/** App-level view model for a restaurant (decoupled from Qloo's payload). */
export interface Restaurant {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  cuisine?: string;
  priceLevel?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

/** App-level view model for a selectable movie preference. */
export interface MovieOption {
  id: string;
  name: string;
  year?: number;
  imageUrl?: string;
}

export interface RestaurantQuery {
  location: string;
  movieIds: readonly string[];
  tagIds?: readonly string[];
  take?: number;
}
