import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import * as smsGatewayController from './sms-gateway.controller.js';

export const smsGatewayRouter = Router();

// No requireAuth — inbound SMS identifies the sender by phone number instead of a bearer
// token (the same trust boundary feature-phone Mobile Money already relies on: possession of
// the SIM is the credential). Configure this URL as the inbound webhook in Africa's Talking.
smsGatewayRouter.post('/inbound', asyncHandler(smsGatewayController.inbound));
