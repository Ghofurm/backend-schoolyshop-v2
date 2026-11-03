import type { Request, Response } from 'express';
import { listCategories } from '../services/categories.service.js';

export async function list(_req: Request, res: Response): Promise<void> {
  const data = await listCategories();

  res.json({ data });
}
