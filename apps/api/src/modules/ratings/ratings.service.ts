import { OrderStatus, type RateOrderInput } from '@farmconnect/shared';
import * as notificationsService from '../notifications/notifications.service.js';
import * as ordersRepository from '../orders/orders.repository.js';
import { findUserById } from '../users/users.repository.js';
import * as ratingsRepository from './ratings.repository.js';

export class OrderNotFoundError extends Error {
  constructor() {
    super('Order not found');
    this.name = 'OrderNotFoundError';
  }
}

export class ForbiddenRatingError extends Error {
  constructor() {
    super('You were not a party to this order');
    this.name = 'ForbiddenRatingError';
  }
}

export class OrderNotRatableError extends Error {
  constructor() {
    super('This order can only be rated once delivery is confirmed');
    this.name = 'OrderNotRatableError';
  }
}

export class AlreadyRatedError extends Error {
  constructor() {
    super('You have already rated this order');
    this.name = 'AlreadyRatedError';
  }
}

function serializeRating(rating: {
  id: string;
  orderId: string;
  raterId: string;
  ratedId: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
}) {
  return {
    id: rating.id,
    orderId: rating.orderId,
    raterId: rating.raterId,
    ratedId: rating.ratedId,
    stars: rating.stars,
    comment: rating.comment,
    createdAt: rating.createdAt,
  };
}

export async function rateOrder(orderId: string, raterId: string, input: RateOrderInput) {
  const order = await ordersRepository.findOrderById(orderId);
  if (!order) {
    throw new OrderNotFoundError();
  }
  if (order.buyerId !== raterId && order.farmerId !== raterId) {
    throw new ForbiddenRatingError();
  }
  if (order.status !== OrderStatus.DELIVERED) {
    throw new OrderNotRatableError();
  }

  const ratedId = order.buyerId === raterId ? order.farmerId : order.buyerId;

  const existing = await ratingsRepository.findByOrderAndRater(orderId, raterId);
  if (existing) {
    throw new AlreadyRatedError();
  }

  const rating = await ratingsRepository.createRatingAndRecompute({
    orderId,
    raterId,
    ratedId,
    stars: input.stars,
    comment: input.comment,
  });

  const [rater, ratedUser] = await Promise.all([findUserById(raterId), findUserById(ratedId)]);
  // In-app only (no SMS) — unlike payment/dispute/moderation events, a rating isn't urgent or
  // actionable, and ratings will only get more frequent as order volume grows.
  await notificationsService.notify({
    userId: ratedId,
    phone: ratedUser?.phone,
    type: 'SYSTEM',
    title: 'New rating',
    body: `${rater?.name ?? 'Someone'} rated you ${input.stars}★ for your ${order.cropType} order.`,
  });

  return serializeRating(rating);
}

export async function getForOrder(orderId: string, userId: string) {
  const order = await ordersRepository.findOrderById(orderId);
  if (!order) {
    throw new OrderNotFoundError();
  }
  if (order.buyerId !== userId && order.farmerId !== userId) {
    throw new ForbiddenRatingError();
  }

  const ratings = await ratingsRepository.findByOrder(orderId);
  const myRating = ratings.find((r) => r.raterId === userId) ?? null;
  const counterpartRating = ratings.find((r) => r.raterId !== userId) ?? null;

  return {
    myRating: myRating ? serializeRating(myRating) : null,
    counterpartRating: counterpartRating ? serializeRating(counterpartRating) : null,
  };
}

export async function getForUser(userId: string) {
  const ratings = await ratingsRepository.findRecentByRatedUser(userId);
  return ratings.map((r) => ({
    ...serializeRating(r),
    raterName: r.rater.name ?? `•${r.rater.phone.slice(-4)}`,
  }));
}
