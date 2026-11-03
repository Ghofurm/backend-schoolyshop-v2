import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import {
  addressIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
} from '../schemas/addresses.schema.js';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from '../services/addresses.service.js';
import { parseInput } from '../utils/validation.js';

export async function list(req: Request, res: Response): Promise<void> {
  const data = await listAddresses(getAuthUser(req).id);

  res.json({ data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(createAddressSchema, req.body);
  const address = await createAddress(getAuthUser(req).id, input);

  res.status(201).json(address);
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseInput(addressIdParamSchema, req.params.id);
  const input = parseInput(updateAddressSchema, req.body);
  const address = await updateAddress(getAuthUser(req).id, id, input);

  res.json(address);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseInput(addressIdParamSchema, req.params.id);

  await deleteAddress(getAuthUser(req).id, id);
  res.status(204).end();
}
