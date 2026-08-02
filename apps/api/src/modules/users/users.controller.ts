import type { Request, Response } from 'express';
import type { UpdateMomoInput } from '@farmconnect/shared';
import { prisma } from '../../lib/prisma.js';

export async function updateMomo(req: Request, res: Response) {
  const { momoProvider, momoPhone, momoAccountName } = req.body as UpdateMomoInput;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { momoProvider, momoPhone, momoAccountName },
  });
  res.status(200).json({
    momoProvider: user.momoProvider,
    momoPhone: user.momoPhone,
    momoAccountName: user.momoAccountName,
  });
}
