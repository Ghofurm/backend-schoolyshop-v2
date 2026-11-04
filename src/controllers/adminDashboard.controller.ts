import type { Request, Response } from 'express';
import { reportDateQuerySchema } from '../schemas/adminReports.schema.js';
import { getDashboardSummary } from '../services/adminDashboard.service.js';
import { parseInput } from '../utils/validation.js';

export async function summary(req: Request, res: Response): Promise<void> {
  const query = parseInput(reportDateQuerySchema, req.query);
  const data = await getDashboardSummary(query);

  res.json(data);
}
