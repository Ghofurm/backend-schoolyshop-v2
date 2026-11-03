import type { Request, Response } from 'express';
import { getAuthUser } from '../middlewares/auth.js';
import { addCartItemSchema, updateCartItemSchema } from '../schemas/cart.schema.js';
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../services/cart.service.js';
import { parseInput } from '../utils/validation.js';
import { productIdParamSchema } from '../schemas/products.schema.js';

export async function show(req: Request, res: Response): Promise<void> {
  const cart = await getCart(getAuthUser(req).id);

  res.json(cart);
}

export async function addItem(req: Request, res: Response): Promise<void> {
  const input = parseInput(addCartItemSchema, req.body);
  const cart = await addCartItem(getAuthUser(req).id, input);

  res.status(201).json(cart);
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const productId = parseInput(productIdParamSchema, req.params.productId);
  const input = parseInput(updateCartItemSchema, req.body);
  const cart = await updateCartItem(getAuthUser(req).id, productId, input.qty);

  res.json(cart);
}

export async function removeItem(req: Request, res: Response): Promise<void> {
  const productId = parseInput(productIdParamSchema, req.params.productId);

  await removeCartItem(getAuthUser(req).id, productId);
  res.status(204).end();
}

export async function clear(req: Request, res: Response): Promise<void> {
  await clearCart(getAuthUser(req).id);
  res.status(204).end();
}
