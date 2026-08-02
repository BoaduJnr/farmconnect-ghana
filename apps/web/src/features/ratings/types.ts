export interface Rating {
  id: string;
  orderId: string;
  raterId: string;
  ratedId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
}

export interface OrderRatingsResult {
  myRating: Rating | null;
  counterpartRating: Rating | null;
}
