import { CROPS, type CropType, Locale, MomoProvider, Role } from '@farmconnect/shared';
import { findRegionCoords } from '../../lib/ghanaRegions.js';
import * as listingsService from '../listings/listings.service.js';
import * as ordersService from '../orders/orders.service.js';
import * as pricesService from '../prices/prices.service.js';
import { createUser, findUserByPhone, updateMomo } from '../users/users.repository.js';
import { parseCommand } from './commandParser.js';
import * as smsGatewayRepository from './sms-gateway.repository.js';

function normalizePhone(raw: string): string {
  if (raw.startsWith('+')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('233')) return `+${digits}`;
  if (digits.startsWith('0')) return `+233${digits.slice(1)}`;
  return `+233${digits}`;
}

const MOMO_PROVIDER_ALIASES: Record<string, MomoProvider> = {
  mtn: MomoProvider.MTN,
  telecel: MomoProvider.TELECEL,
  vodafone: MomoProvider.TELECEL,
  airteltigo: MomoProvider.AIRTELTIGO,
  at: MomoProvider.AIRTELTIGO,
};

const HELP_TEXT =
  'FarmConnect commands: REG <name> | MOMO <mtn/telecel/airteltigo> <phone> | ' +
  'LIST <crop> <qtyKg> <priceKg> <region> | PRICE <crop> | ORDERS | CONFIRM <orderId> | HELP';

export async function handleInboundSms(fromRaw: string, rawText: string): Promise<string> {
  const from = normalizePhone(fromRaw);
  const parsed = parseCommand(rawText);

  let response: string;
  try {
    response = await dispatch(from, parsed);
  } catch {
    response = 'Sorry, something went wrong processing that. Text HELP for commands.';
  }

  await smsGatewayRepository.logInbound(from, rawText, parsed?.command ?? null, response);
  return response;
}

async function dispatch(from: string, parsed: ReturnType<typeof parseCommand>): Promise<string> {
  if (!parsed) return HELP_TEXT;

  switch (parsed.command) {
    case 'HELP':
      return HELP_TEXT;
    case 'REG':
      return handleReg(from, parsed.args);
    case 'MOMO':
      return handleMomo(from, parsed.args);
    case 'LIST':
      return handleList(from, parsed.args);
    case 'PRICE':
      return handlePrice(parsed.args);
    case 'ORDERS':
      return handleOrders(from);
    case 'CONFIRM':
      return handleConfirm(from, parsed.args);
    default:
      return `Unknown command "${parsed.command}". ${HELP_TEXT}`;
  }
}

async function handleReg(from: string, args: string[]): Promise<string> {
  const name = args.join(' ').trim();
  if (!name) return 'Usage: REG <your name>';

  const existing = await findUserByPhone(from);
  if (existing) {
    return `You're already registered as a ${existing.role.toLowerCase()}.`;
  }

  await createUser({ phone: from, role: Role.FARMER, locale: Locale.EN, name });
  return `Welcome to FarmConnect, ${name}! Next, text MOMO <network> <phone> to link where buyers pay you, e.g. MOMO mtn 0241234567`;
}

async function handleMomo(from: string, args: string[]): Promise<string> {
  const user = await findUserByPhone(from);
  if (!user) return 'Text REG <name> first to register.';
  if (user.role !== Role.FARMER) return 'Only farmers link Mobile Money payout details.';

  const [providerRaw, phoneRaw] = args;
  const provider = providerRaw ? MOMO_PROVIDER_ALIASES[providerRaw.toLowerCase()] : undefined;
  if (!provider || !phoneRaw) {
    return 'Usage: MOMO <mtn/telecel/airteltigo> <phone>, e.g. MOMO mtn 0241234567';
  }

  await updateMomo(user.id, {
    momoProvider: provider,
    momoPhone: normalizePhone(phoneRaw),
    momoAccountName: user.name ?? `Farmer ${from.slice(-4)}`,
  });
  return 'Mobile Money details saved. You can now text LIST to add produce.';
}

async function handleList(from: string, args: string[]): Promise<string> {
  const user = await findUserByPhone(from);
  if (!user) return 'Text REG <name> first to register.';
  if (user.role !== Role.FARMER) return 'Only farmers can list produce.';

  const [cropRaw, qtyRaw, priceRaw, ...regionParts] = args;
  const region = regionParts.join(' ');
  const cropType = cropRaw?.toLowerCase() as CropType;

  if (!cropType || !(cropType in CROPS) || !qtyRaw || !priceRaw || !region) {
    return 'Usage: LIST <crop> <qtyKg> <priceKg> <region>, e.g. LIST maize 200 4.50 Kumasi';
  }

  const coords = findRegionCoords(region);
  if (!coords) {
    return `Unknown region "${region}". Try a major town, e.g. Kumasi, Accra, Tamale, Takoradi.`;
  }

  try {
    const listing = await listingsService.create(user.id, {
      cropType,
      quantityKg: Number(qtyRaw),
      pricePerKg: Number(priceRaw),
      photos: [],
      sellAsCoop: false,
      lat: coords.lat,
      lng: coords.lng,
      regionLabel: region,
    });
    return `Listed ${listing.quantityKg}kg of ${cropType} at GHS ${listing.pricePerKg}/kg. Buyers can now find it.`;
  } catch (err) {
    if (err instanceof listingsService.FarmerMomoNotSetupError) {
      return 'Link your Mobile Money first: MOMO <mtn/telecel/airteltigo> <phone>';
    }
    throw err;
  }
}

async function handlePrice(args: string[]): Promise<string> {
  const cropType = args[0]?.toLowerCase() as CropType;
  if (!cropType || !(cropType in CROPS)) {
    return 'Usage: PRICE <crop>, e.g. PRICE maize';
  }
  const prices = await pricesService.getLatestPrices();
  const row = prices.find((p) => p.cropType === cropType);
  if (!row) return `No price data yet for ${cropType}.`;
  return `${cropType}: GHS ${row.price.toFixed(2)}/kg (${row.up ? '+' : ''}${row.changePct}%)`;
}

async function handleOrders(from: string): Promise<string> {
  const user = await findUserByPhone(from);
  if (!user) return 'Text REG <name> first to register.';

  const orders = await ordersService.listMine(user.id, user.role === Role.FARMER ? 'FARMER' : 'BUYER');
  const actionable =
    user.role === Role.FARMER
      ? orders.filter((o) => o.status === 'payment_submitted')
      : orders.filter((o) => o.status === 'pending' || o.status === 'payment_rejected');

  if (actionable.length === 0) return 'No orders need your attention right now.';

  const lines = actionable
    .slice(0, 5)
    .map((o) => `${o.id.slice(-6)}: ${o.cropType} GHS ${o.total.toFixed(2)} (${o.status})`);
  return lines.join(' | ');
}

async function handleConfirm(from: string, args: string[]): Promise<string> {
  const user = await findUserByPhone(from);
  if (!user) return 'Text REG <name> first to register.';
  if (user.role !== Role.FARMER) return 'Only farmers confirm payments.';

  const shortId = args[0];
  if (!shortId) return 'Usage: CONFIRM <orderId>';

  const orders = await ordersService.listMine(user.id, 'FARMER');
  const match = orders.find((o) => o.status === 'payment_submitted' && o.id.endsWith(shortId));
  if (!match) return `No pending payment found matching "${shortId}". Text ORDERS to see pending items.`;

  await ordersService.confirmPayment(match.id, user.id);
  return `Payment confirmed for ${match.cropType} order ${shortId}.`;
}
